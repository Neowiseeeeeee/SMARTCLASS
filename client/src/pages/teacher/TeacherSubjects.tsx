import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { presentationsApi } from '../../lib/api'
import {
  BookOpen, Upload, FileText, ImageIcon, Trash2,
  ChevronRight, ChevronDown, FolderOpen, Play, Monitor, Clock,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState, LoadingSpinner } from '../../components/ui/EmptyState'
import { formatDateTime, timeAgo } from '../../lib/utils'

// ─── Presentation overlay ─────────────────────────────────────────────────────
function PresentOverlay({
  material,
  onClose,
}: {
  material: any
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm">
        <div>
          <p className="text-white font-poppins font-semibold">{material.title}</p>
          <p className="text-white/50 font-inter text-xs mt-0.5">{material.originalName}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors ml-4"
        >
          <span className="font-inter text-sm">✕ Exit</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {material.fileType === 'image' ? (
          <img
            src={material.filePath}
            alt={material.title}
            className="w-full h-full object-contain"
          />
        ) : material.fileType === 'pdf' ? (
          <iframe
            src={material.filePath}
            className="w-full h-full"
            title={material.title}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/60">
            <FileText className="w-20 h-20" />
            <p className="font-poppins text-xl">{material.title}</p>
            <p className="font-inter text-sm">{material.originalName}</p>
            <a
              href={material.filePath}
              download
              className="mt-2 px-5 py-2.5 bg-primary rounded-xl text-white font-poppins text-sm hover:bg-primary-dark transition-colors"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TeacherSubjects() {
  const { user } = useAuth()
  const teacher = user?.profile
  const assignments: any[] = teacher?.subjectAssignments || []
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [presentingMaterial, setPresentingMaterial] = useState<any | null>(null)

  // Group assignments by section
  const sectionGroups = useMemo(() => {
    const map: Record<string, { section: any; subjects: any[] }> = {}
    assignments.forEach((a: any) => {
      if (!a.sectionId) return
      if (!map[a.sectionId]) map[a.sectionId] = { section: a.section, subjects: [] }
      if (!map[a.sectionId].subjects.find((s: any) => s.subjectId === a.subjectId)) {
        map[a.sectionId].subjects.push(a)
      }
    })
    return Object.values(map)
  }, [assignments])

  // Sync from URL params on mount / param change
  useEffect(() => {
    const sectionId = searchParams.get('sectionId')
    const subjectId = searchParams.get('subjectId')
    if (sectionId) setSelectedSectionId(sectionId)
    if (sectionId && subjectId && assignments.length > 0) {
      const a = assignments.find(
        (a: any) => a.subjectId === subjectId && a.sectionId === sectionId,
      )
      if (a) setSelectedAssignment(a)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('sectionId'), searchParams.get('subjectId'), assignments.length])

  // Materials for the selected subject+section
  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['presentation-materials', selectedAssignment?.subjectId, selectedAssignment?.sectionId],
    queryFn: () =>
      presentationsApi
        .getAll({
          teacherId: teacher?.id,
          subjectId: selectedAssignment.subjectId,
          sectionId: selectedAssignment.sectionId,
        })
        .then(r => r.data),
    enabled: !!selectedAssignment,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => presentationsApi.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['presentation-materials'] }),
  })

  async function handleFileChosen(file: File) {
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a title first')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', uploadTitle.trim())
      fd.append('subjectId', selectedAssignment.subjectId)
      fd.append('sectionId', selectedAssignment.sectionId)
      await presentationsApi.upload(fd)
      setUploadTitle('')
      queryClient.invalidateQueries({ queryKey: ['presentation-materials'] })
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function toggleSection(sectionId: string) {
    const opening = selectedSectionId !== sectionId
    setSelectedSectionId(opening ? sectionId : null)
    setSelectedAssignment(null)
    setSearchParams({})
  }

  function toggleAssignment(a: any) {
    const isSame =
      selectedAssignment?.subjectId === a.subjectId &&
      selectedAssignment?.sectionId === a.sectionId
    const next = isSame ? null : a
    setSelectedAssignment(next)
    setUploadError(null)
    setUploadTitle('')
    if (next) {
      setSearchParams({ sectionId: a.sectionId, subjectId: a.subjectId })
    } else {
      setSearchParams({ sectionId: a.sectionId })
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (assignments.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Manage presentation materials by section and subject
          </p>
        </div>
        <EmptyState
          title="No Assigned Subjects"
          description="Contact your administrator to get subjects and sections assigned to your account."
          icon={<BookOpen className="w-8 h-8 text-primary" />}
        />
      </div>
    )
  }

  return (
    <>
      {/* Full-screen presentation overlay */}
      {presentingMaterial && (
        <PresentOverlay
          material={presentingMaterial}
          onClose={() => setPresentingMaterial(null)}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Select a section, then a subject to upload and manage presentation materials.
          </p>
        </div>

        {/* ── Section cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionGroups.map(({ section, subjects }) => {
            const isOpen = selectedSectionId === section?.id
            return (
              <div
                key={section?.id}
                onClick={() => toggleSection(section?.id)}
                className={`card cursor-pointer select-none transition-all duration-200 ${
                  isOpen
                    ? 'ring-2 ring-primary shadow-card-hover'
                    : 'hover:shadow-card-hover hover:ring-1 hover:ring-primary/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isOpen ? 'bg-primary' : 'bg-primary-light'
                    }`}
                  >
                    <FolderOpen
                      className={`w-6 h-6 ${isOpen ? 'text-white' : 'text-primary'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-poppins font-semibold text-text-primary truncate">
                      {section?.name}
                    </p>
                    <p className="text-text-secondary font-inter text-xs mt-0.5">
                      {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Subjects in selected section ────────────────────────────────────── */}
        {selectedSectionId && (() => {
          const group = sectionGroups.find(g => g.section?.id === selectedSectionId)
          if (!group) return null
          return (
            <div className="card">
              <h2 className="section-heading mb-4">Subjects in {group.section?.name}</h2>
              <div className="grid gap-2">
                {group.subjects.map((a: any) => {
                  const isSelected =
                    selectedAssignment?.subjectId === a.subjectId &&
                    selectedAssignment?.sectionId === a.sectionId
                  return (
                    <div
                      key={a.subjectId}
                      onClick={() => toggleAssignment(a)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-background hover:bg-primary-light/60'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-white/20' : 'bg-primary-light'
                        }`}
                      >
                        <BookOpen
                          className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-primary'}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-poppins font-semibold truncate ${
                            isSelected ? 'text-white' : 'text-text-primary'
                          }`}
                        >
                          {a.subject?.name}
                        </p>
                        <p
                          className={`font-inter text-xs mt-0.5 ${
                            isSelected ? 'text-white/75' : 'text-text-secondary'
                          }`}
                        >
                          {a.subject?.code}
                        </p>
                      </div>
                      {isSelected ? (
                        <ChevronDown className="w-4 h-4 text-white/80 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Materials panel ──────────────────────────────────────────────────── */}
        {selectedAssignment && (
          <div className="card space-y-5">
            {/* Panel header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-heading">{selectedAssignment.subject?.name}</h2>
                <p className="text-text-secondary font-inter text-xs mt-0.5">
                  {sectionGroups.find(g => g.section?.id === selectedSectionId)?.section?.name}{' '}
                  · Presentation Materials
                </p>
              </div>
              <button
                onClick={() => navigate('/teacher/presentation')}
                className="flex items-center gap-1.5 text-primary text-xs font-inter font-medium hover:text-primary-dark transition-colors flex-shrink-0"
              >
                <Monitor className="w-3.5 h-3.5" /> Presentation Tab
              </button>
            </div>

            {/* Upload area */}
            <div className="rounded-xl border-2 border-dashed border-border p-5 space-y-3 bg-background/50">
              <p className="font-poppins font-semibold text-sm text-text-primary">
                Upload New Material
              </p>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Material title (e.g. Chapter 1 Slides)"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary placeholder:text-text-secondary"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!uploadTitle.trim() || uploading}
                  loading={uploading}
                >
                  {uploading ? 'Uploading…' : 'Choose File'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.ppt,.pptx"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileChosen(file)
                    e.target.value = ''
                  }}
                />
              </div>
              {uploadError && (
                <p className="text-red-500 text-xs font-inter">{uploadError}</p>
              )}
              <p className="text-text-secondary font-inter text-xs">
                Accepted: Images (JPG, PNG, GIF, WebP), PDF, PowerPoint (.ppt/.pptx) · Max 50 MB
              </p>
            </div>

            {/* Materials list */}
            {loadingMaterials ? (
              <LoadingSpinner />
            ) : materials.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-text-secondary/30 mx-auto mb-2" />
                <p className="font-inter text-sm text-text-secondary">
                  No materials uploaded yet for this subject.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <p className="font-poppins font-semibold text-sm text-text-primary">
                  Uploaded Materials ({materials.length})
                </p>
                {(materials as any[]).map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 bg-background rounded-xl group hover:bg-primary-light/30 transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                      {m.fileType === 'image' ? (
                        <ImageIcon className="w-5 h-5 text-primary" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    {/* Info */}
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

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setPresentingMaterial(m)}
                        title="Present full-screen"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-inter hover:bg-primary-dark transition-colors"
                      >
                        <Play className="w-3 h-3" /> Present
                      </button>
                      <a
                        href={m.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-inter text-text-primary hover:bg-border transition-colors"
                      >
                        View
                      </a>
                      <button
                        onClick={() => deleteMutation.mutate(m.id)}
                        title="Delete"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
