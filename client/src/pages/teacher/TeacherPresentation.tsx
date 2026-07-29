import React, { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { Monitor, BookOpen, FileText, Image, Play, X } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'

export default function TeacherPresentation() {
  const { user } = useAuth()
  const teacher = user?.profile
  const assignments = teacher?.subjectAssignments || []
  const [presentMode, setPresentMode] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Instructional Presentation</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          Organize and present instructional materials for your classes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* External Display Mode Card */}
        <div className="card border-2 border-dashed border-primary/30 bg-primary-light/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-text-primary mb-1">External Display Mode</h3>
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

        {/* Internal Mode Card */}
        <div className="card border-2 border-primary bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-text-primary mb-1">Internal Presentation Mode</h3>
              <p className="text-text-secondary font-inter text-sm">
                Present materials uploaded directly to SMARTCLASS, organized by your class schedule.
              </p>
              <Button
                className="mt-3"
                size="sm"
                icon={<Play className="w-3.5 h-3.5" />}
                onClick={() => setPresentMode(true)}
              >
                Browse Materials
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <EmptyState
          title="No Assigned Classes"
          description="Contact your administrator to get subjects and sections assigned to your account."
          icon={<BookOpen className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="card">
          <h2 className="section-heading mb-4">Your Assigned Classes</h2>
          <p className="text-text-secondary font-inter text-sm mb-4">
            Select a class to manage and present its instructional materials.
          </p>
          <div className="grid gap-3">
            {assignments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 p-4 bg-background hover:bg-primary-light/50 rounded-xl transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-poppins font-semibold text-text-primary">{a.subject?.name}</p>
                  <p className="text-text-secondary font-inter text-sm">
                    {a.section?.name} · {a.academicYear?.name}
                  </p>
                </div>
                <Button size="sm" variant="secondary" icon={<Play className="w-3.5 h-3.5" />}>
                  Present
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presentation Mode Overlay */}
      {presentMode && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80">
            <span className="text-white font-poppins font-semibold">Presentation Mode</span>
            <button onClick={() => setPresentMode(false)} className="text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white/50">
              <Monitor className="w-16 h-16 mx-auto mb-4" />
              <p className="font-poppins text-xl">Select a presentation file</p>
              <p className="font-inter text-sm mt-2">Upload materials via the file manager to present them here</p>
              <Button variant="secondary" className="mt-6" onClick={() => setPresentMode(false)}>
                Exit Presentation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
