import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { presentationsApi } from '../../lib/api'
import {
  Monitor, BookOpen, FileText, ImageIcon, Play, X, ChevronRight, FolderOpen, Clock, Video,
} from 'lucide-react'
import { EmptyState, LoadingSpinner } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { formatDateTime, timeAgo } from '../../lib/utils'

// ─── Full-screen presentation overlay ────────────────────────────────────────
function PresentOverlay({
  material,
  onClose,
}: {
  material: any
  onClose: () => void
}) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(false)

  useEffect(() => {
    if (material.fileType !== 'pdf') return
    let revoked = false
    setPdfLoading(true)
    setPdfError(false)
    fetch(material.filePath)
      .then(r => r.blob())
      .then(blob => {
        if (revoked) return
        setPdfBlobUrl(URL.createObjectURL(blob))
        setPdfLoading(false)
      })
      .catch(() => { if (!revoked) { setPdfError(true); setPdfLoading(false) } })
    return () => {
      revoked = true
      setPdfBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    }
  }, [material.filePath, material.fileType])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm flex-shrink-0">
        <div>
          <p className="text-white font-poppins font-semibold">{material.title}</p>
          <p className="text-white/50 font-inter text-xs mt-0.5">
            {material.subject?.name} · {material.section?.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
          <span className="font-inter text-sm">Exit</span>
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto">
        {material.fileType === 'image' ? (
          /* ── Image ── */
          <img
            src={material.filePath}
            alt={material.title}
            className="w-full h-full object-contain"
          />
        ) : material.fileType === 'video' ? (
          /* ── Video — native player with full controls ── */
          <div className="flex items-center justify-center w-full h-full bg-black">
            <video
              src={material.filePath}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full"
              style={{ maxHeight: 'calc(100vh - 56px)' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : material.fileType === 'pdf' ? (
          /* ── PDF — embedded & scrollable ── */
          pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : pdfError || !pdfBlobUrl ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/60">
              <FileText className="w-20 h-20" />
              <p className="font-poppins text-lg text-white">{material.title}</p>
              <a
                href={material.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 px-5 py-2.5 bg-primary rounded-xl text-white font-poppins text-sm hover:bg-primary-dark transition-colors"
              >
                Open PDF in New Tab
              </a>
            </div>
          ) : (
            <iframe
              src={pdfBlobUrl}
              title={material.title}
              className="w-full h-full border-0"
              style={{ minHeight: 'calc(100vh - 56px)' }}
            />
          )
        ) : material.fileType === 'pptx' || material.fileType === 'doc' ? (
          /* ── Office documents — scrollable info + download ── */
          <div className="flex flex-col items-center justify-center min-h-full gap-6 py-12 px-6 text-white/70">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <p className="font-poppins text-xl text-white font-semibold">{material.title}</p>
              <p className="font-inter text-sm mt-1">{material.originalName}</p>
              <p className="font-inter text-xs mt-2 text-white/40">
                {material.fileType === 'pptx' ? 'PowerPoint Presentation' : 'Word Document'}
              </p>
            </div>
            <p className="font-inter text-sm text-white/50 text-center max-w-xs">
              Office documents can't be rendered in the browser. Download the file to open it in Microsoft Office or Google Docs.
            </p>
            <div className="flex gap-3">
              <a
                href={material.filePath}
                download
                className="px-5 py-2.5 bg-primary rounded-xl text-white font-poppins text-sm hover:bg-primary-dark transition-colors"
              >
                Download File
              </a>
              <a
                href={material.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-white/10 rounded-xl text-white font-poppins text-sm hover:bg-white/20 transition-colors"
              >
                Open in Browser
              </a>
            </div>
          </div>
        ) : (
          /* ── Generic fallback ── */
          <div className="flex flex-col items-center justify-center min-h-full gap-4 py-12 text-white/60">
            <FileText className="w-20 h-20" />
            <p className="font-poppins text-xl text-white">{material.title}</p>
            <p className="font-inter text-sm">{material.originalName}</p>
            <a
              href={material.filePath}
              download
              className="mt-2 px-5 py-2.5 bg-primary rounded-xl text-white font-poppins text-sm hover:bg-primary-dark transition-colors"
            >
              Download to Present
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TeacherPresentation() {
  const { user } = useAuth()
  const teacher = user?.profile
  const assignments: any[] = teacher?.subjectAssignments || []
  const navigate = useNavigate()
  const [presentingMaterial, setPresentingMaterial] = useState<any | null>(null)
  const [expandedAssignmentKey, setExpandedAssignmentKey] = useState<string | null>(null)

  // Fetch ALL materials for this teacher
  const { data: allMaterials = [], isLoading } = useQuery({
    queryKey: ['presentation-materials-all', teacher?.id],
    queryFn: () =>
      presentationsApi.getAll({ teacherId: teacher?.id }).then(r => r.data),
    enabled: !!teacher?.id,
  })

  // Build assignment key from subjectId + sectionId
  function assignmentKey(a: any) {
    return `${a.subjectId}__${a.sectionId}`
  }

  function materialsFor(a: any) {
    return (allMaterials as any[]).filter(
      m => m.subjectId === a.subjectId && m.sectionId === a.sectionId,
    )
  }

  function toggleExpand(a: any) {
    const key = assignmentKey(a)
    setExpandedAssignmentKey(prev => (prev === key ? null : key))
  }

  return (
    <>
      {presentingMaterial && (
        <PresentOverlay
          material={presentingMaterial}
          onClose={() => setPresentingMaterial(null)}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="page-title">Instructional Presentation</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Browse and present uploaded materials. To upload new materials, go to the Subjects tab.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* External Display */}
          <div className="card border-2 border-dashed border-primary/30 bg-primary-light/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-text-primary mb-1">
                  External Display Mode
                </h3>
                <p className="text-text-secondary font-inter text-sm">
                  Connect via HDMI to present from an external device. The kiosk acts as a classroom monitor.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-text-secondary rounded-full" />
                  <span className="text-xs text-text-secondary font-inter">No HDMI source detected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Mode */}
          <div className="card border-2 border-primary bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-text-primary mb-1">
                  Internal Presentation Mode
                </h3>
                <p className="text-text-secondary font-inter text-sm">
                  Select any uploaded material below to launch it full-screen.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  icon={<FolderOpen className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/teacher/subjects')}
                >
                  Upload Materials
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Materials by class */}
        {assignments.length === 0 ? (
          <EmptyState
            title="No Assigned Classes"
            description="Contact your administrator to get subjects and sections assigned to your account."
            icon={<BookOpen className="w-8 h-8 text-primary" />}
          />
        ) : (
          <div className="card space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="section-heading">Your Classes</h2>
              {isLoading && <LoadingSpinner />}
            </div>

            {assignments.map((a: any) => {
              const key = assignmentKey(a)
              const isExpanded = expandedAssignmentKey === key
              const mats = materialsFor(a)

              return (
                <div key={key} className="rounded-xl border border-border overflow-hidden">
                  {/* Class row */}
                  <button
                    onClick={() => toggleExpand(a)}
                    className="w-full flex items-center gap-4 p-4 bg-background hover:bg-primary-light/40 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-poppins font-semibold text-text-primary truncate">
                        {a.subject?.name}
                      </p>
                      <p className="text-text-secondary font-inter text-sm">
                        {a.section?.name} · {a.academicYear?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="badge bg-primary-light text-primary text-xs">
                        {mats.length} file{mats.length !== 1 ? 's' : ''}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Materials list */}
                  {isExpanded && (
                    <div className="border-t border-border bg-surface">
                      {mats.length === 0 ? (
                        <div className="flex items-center justify-between px-5 py-4">
                          <p className="font-inter text-sm text-text-secondary">
                            No materials uploaded yet.
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<FolderOpen className="w-3.5 h-3.5" />}
                            onClick={() =>
                              navigate(
                                `/teacher/subjects?sectionId=${a.sectionId}&subjectId=${a.subjectId}`,
                              )
                            }
                          >
                            Upload Now
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {mats.map((m: any) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-3 px-5 py-3 hover:bg-primary-light/20 transition-colors"
                            >
                              <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                                {m.fileType === 'image' ? (
                                  <ImageIcon className="w-4 h-4 text-primary" />
                                ) : m.fileType === 'video' ? (
                                  <Video className="w-4 h-4 text-primary" />
                                ) : (
                                  <FileText className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-inter text-sm font-medium text-text-primary truncate">
                                  {m.title}
                                </p>
                                <p className="font-inter text-xs text-text-secondary truncate">
                                  {m.originalName}
                                </p>
                                <p
                                  className="font-inter text-[11px] text-text-secondary/70 mt-0.5 flex items-center gap-1"
                                  title={formatDateTime(m.uploadedAt)}
                                >
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  {timeAgo(m.uploadedAt)}
                                </p>
                              </div>
                              <button
                                onClick={() => setPresentingMaterial(m)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-poppins font-medium hover:bg-primary-dark transition-colors flex-shrink-0"
                              >
                                <Play className="w-3 h-3" /> Present
                              </button>
                            </div>
                          ))}
                          <div className="px-5 py-3">
                            <button
                              onClick={() =>
                                navigate(
                                  `/teacher/subjects?sectionId=${a.sectionId}&subjectId=${a.subjectId}`,
                                )
                              }
                              className="text-primary text-xs font-inter hover:underline"
                            >
                              + Add more materials
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
