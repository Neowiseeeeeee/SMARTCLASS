import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import {
  Plus, Megaphone, Trash2, Eye, EyeOff, Upload, X,
  FileText, Image as ImageIcon, AlertCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'

// ── Media preview helper ───────────────────────────────────────────────────────

function MediaThumb({ image, pdf }: { image?: string; pdf?: string }) {
  if (image) {
    return (
      <div className="w-20 h-14 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
        <img src={image} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  if (pdf) {
    return (
      <div className="w-20 h-14 rounded-xl border border-gray-200 bg-red-50 flex flex-col items-center justify-center gap-1 flex-shrink-0">
        <FileText className="w-5 h-5 text-red-500" />
        <span className="text-[10px] font-inter font-medium text-red-500">PDF</span>
      </div>
    )
  }
  return null
}

// ── Upload zone inside modal ──────────────────────────────────────────────────

interface UploadZoneProps {
  file: File | null
  onChange: (f: File | null) => void
  existingImage?: string
  existingPdf?: string
}

function UploadZone({ file, onChange, existingImage, existingPdf }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')

  const handleFile = (f: File) => {
    setErr('')
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowed.includes(f.type)) {
      setErr('Only images (JPEG, PNG, GIF, WebP) or PDF files are allowed.')
      return
    }
    if (f.size > 20 * 1024 * 1024) { setErr('File must be under 20 MB.'); return }
    onChange(f)
  }

  const preview = file ? URL.createObjectURL(file) : null
  const isPdf = file ? file.type === 'application/pdf' : existingPdf ? true : false
  const isImage = file ? file.type.startsWith('image/') : existingImage ? true : false
  const displaySrc = preview || existingImage || existingPdf || null
  const hasMedia = !!file || !!existingImage || !!existingPdf

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium font-inter text-text-primary">
        Image or PDF (optional)
      </label>
      <p className="text-xs text-text-secondary font-inter -mt-1">
        Upload a poster, canvas, flyer, or PDF — displayed full-width on the announcement board.
      </p>

      {hasMedia ? (
        <div className="relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
          {isImage && displaySrc && (
            <img src={displaySrc} alt="" className="w-full max-h-52 object-contain" />
          )}
          {isPdf && (
            <div className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="font-inter font-medium text-text-primary text-sm">
                  {file ? file.name : 'Attached PDF'}
                </p>
                <p className="text-xs text-text-secondary font-inter">
                  {file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : 'Existing attachment'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm transition-colors"
            title="Remove"
          >
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-all duration-200',
            drag ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50 hover:bg-gray-50',
          )}
        >
          <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors', drag ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary')}>
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-inter font-medium text-text-primary">Drop a file here or click to browse</p>
            <p className="text-xs text-text-secondary font-inter mt-0.5">Images (JPEG, PNG, GIF, WebP) or PDF · Max 20 MB</p>
          </div>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 text-sm text-danger font-inter">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminAnnouncements() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [form, setForm] = useState({
    title: '', categoryId: '', description: '', content: '',
    publishStatus: 'published', displayPriority: 0,
  })
  const [catForm, setCatForm] = useState({ name: '', icon: '' })

  // Per-announcement upload state
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['all-announcements'],
    queryFn: () => announcementsApi.getAll().then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['announcement-categories'],
    queryFn: () => announcementsApi.getCategories().then(r => r.data),
  })

  const resetForm = () => {
    setForm({ title: '', categoryId: '', description: '', content: '', publishStatus: 'published', displayPriority: 0 })
    setMediaFile(null)
    setUploadError('')
  }

  const createMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await announcementsApi.create(d)
      if (mediaFile) {
        try {
          await announcementsApi.uploadMedia(res.data.id, mediaFile)
        } catch {
          setUploadError('Announcement created but media upload failed. You can re-attach it from the list.')
        }
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-announcements'] })
      setShowAdd(false)
      resetForm()
    },
  })

  const createCatMutation = useMutation({
    mutationFn: (d: any) => announcementsApi.createCategory(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcement-categories'] })
      setShowAddCat(false)
      setCatForm({ name: '', icon: '' })
    },
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, status }: any) => announcementsApi.update(id, { publishStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-announcements'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-announcements'] }),
  })

  const uploadMediaMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => announcementsApi.uploadMedia(id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-announcements'] }); setAttachingId(null); setAttachFile(null) },
  })

  const removeMediaMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.removeMedia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-announcements'] }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Manage the Digital Announcement Board — images, PDFs, posters, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowAddCat(true)} size="sm">+ Category</Button>
          <Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>New Announcement</Button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {(categories as any[]).map((c: any) => (
          <span key={c.id} className="badge bg-primary-light text-primary-dark text-sm py-1.5 px-3">
            {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
          </span>
        ))}
        {(categories as any[]).length === 0 && (
          <p className="text-text-secondary font-inter text-sm">No categories yet. Add one to organize announcements.</p>
        )}
      </div>

      {/* Announcement list */}
      {(announcements as any[]).length === 0 ? (
        <EmptyState
          title="No Announcements"
          description="Create your first announcement to display on the kiosk."
          action={<Button onClick={() => setShowAdd(true)}>Create Announcement</Button>}
          icon={<Megaphone className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="grid gap-4">
          {(announcements as any[]).map((a: any) => (
            <div key={a.id} className="card">
              <div className="flex items-start gap-4">
                {/* Media thumb */}
                <MediaThumb image={a.image} pdf={a.pdf} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-poppins font-semibold text-text-primary">{a.title}</h3>
                    <Badge variant={a.publishStatus === 'published' ? 'success' : a.publishStatus === 'archived' ? 'danger' : 'default'}>
                      {a.publishStatus}
                    </Badge>
                    {a.category && (
                      <span className="badge bg-primary-light text-primary-dark">{a.category.name}</span>
                    )}
                    {a.image && (
                      <span className="inline-flex items-center gap-1 badge bg-blue-50 text-blue-600">
                        <ImageIcon className="w-3 h-3" /> Image
                      </span>
                    )}
                    {a.pdf && (
                      <span className="inline-flex items-center gap-1 badge bg-red-50 text-red-600">
                        <FileText className="w-3 h-3" /> PDF
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-text-secondary font-inter text-sm mt-1 line-clamp-2">{a.description}</p>
                  )}
                  <p className="text-xs text-text-secondary font-inter mt-2">
                    {a.publishedAt ? formatDate(a.publishedAt) : formatDate(a.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                  {/* Attach/replace media */}
                  {attachingId === a.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={attachInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={e => setAttachFile(e.target.files?.[0] || null)}
                      />
                      {attachFile ? (
                        <Button
                          size="sm"
                          loading={uploadMediaMutation.isPending}
                          onClick={() => uploadMediaMutation.mutate({ id: a.id, file: attachFile })}
                        >
                          Upload
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => attachInputRef.current?.click()}>
                          Choose File
                        </Button>
                      )}
                      <button
                        onClick={() => { setAttachingId(null); setAttachFile(null) }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAttachingId(a.id); setAttachFile(null) }}
                      className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                      title={a.image || a.pdf ? 'Replace media' : 'Add image or PDF'}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  )}

                  {/* Remove media */}
                  {(a.image || a.pdf) && attachingId !== a.id && (
                    <button
                      onClick={() => removeMediaMutation.mutate(a.id)}
                      className="p-1.5 hover:bg-gray-100 text-text-secondary rounded-lg transition-colors"
                      title="Remove media"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}

                  {/* Publish toggle */}
                  <button
                    onClick={() => togglePublish.mutate({ id: a.id, status: a.publishStatus === 'published' ? 'unpublished' : 'published' })}
                    className={`p-1.5 rounded-lg transition-colors ${a.publishStatus === 'published' ? 'hover:bg-warning/10 text-warning' : 'hover:bg-success/10 text-success'}`}
                    title={a.publishStatus === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {a.publishStatus === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(a.id)}
                    className="p-1.5 hover:bg-danger/10 text-danger rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Announcement Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); resetForm() }}
        title="New Announcement"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || !form.categoryId}
            >
              {form.publishStatus === 'published' ? 'Publish' : 'Save Draft'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Title *" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Category *</label>
            <select className="input-field" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select Category</option>
              {(categories as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Description</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Brief description shown alongside the media on the kiosk…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <UploadZone
            file={mediaFile}
            onChange={setMediaFile}
          />

          {uploadError && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm font-inter text-yellow-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {uploadError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Status</label>
            <select className="input-field" value={form.publishStatus} onChange={e => setForm(f => ({ ...f, publishStatus: e.target.value }))}>
              <option value="published">Published (visible on kiosk)</option>
              <option value="unpublished">Unpublished (draft)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* New Category Modal */}
      <Modal
        open={showAddCat}
        onClose={() => setShowAddCat(false)}
        title="New Category"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAddCat(false)}>Cancel</Button>
            <Button loading={createCatMutation.isPending} onClick={() => createCatMutation.mutate(catForm)} disabled={!catForm.name}>Create</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Category Name *" placeholder="e.g. School Announcements" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Icon (emoji or symbol)" placeholder="📢" value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
