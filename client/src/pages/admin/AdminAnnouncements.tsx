import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import { Plus, Megaphone, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

export default function AdminAnnouncements() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [form, setForm] = useState({ title: '', categoryId: '', description: '', content: '', publishStatus: 'published', displayPriority: 0 })
  const [catForm, setCatForm] = useState({ name: '', icon: '' })

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['all-announcements'],
    queryFn: () => announcementsApi.getAll().then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['announcement-categories'],
    queryFn: () => announcementsApi.getCategories().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => announcementsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-announcements'] }); setShowAdd(false); setForm({ title: '', categoryId: '', description: '', content: '', publishStatus: 'published', displayPriority: 0 }) },
  })

  const createCatMutation = useMutation({
    mutationFn: (d: any) => announcementsApi.createCategory(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcement-categories'] }); setShowAddCat(false); setCatForm({ name: '', icon: '' }) },
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, status }: any) => announcementsApi.update(id, { publishStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-announcements'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-announcements'] }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">Manage the Digital Announcement Board</p>
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
            <div key={a.id} className="card flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-poppins font-semibold text-text-primary">{a.title}</h3>
                  <Badge variant={a.publishStatus === 'published' ? 'success' : a.publishStatus === 'archived' ? 'danger' : 'default'}>
                    {a.publishStatus}
                  </Badge>
                  {a.category && <span className="badge bg-primary-light text-primary-dark">{a.category.name}</span>}
                </div>
                {a.description && <p className="text-text-secondary font-inter text-sm mt-1 line-clamp-2">{a.description}</p>}
                <p className="text-xs text-text-secondary font-inter mt-2">
                  {a.publishedAt ? formatDate(a.publishedAt) : formatDate(a.createdAt)}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => togglePublish.mutate({ id: a.id, status: a.publishStatus === 'published' ? 'unpublished' : 'published' })}
                  className={`p-1.5 rounded-lg transition-colors ${a.publishStatus === 'published' ? 'hover:bg-warning/10 text-warning' : 'hover:bg-success/10 text-success'}`}
                  title={a.publishStatus === 'published' ? 'Unpublish' : 'Publish'}
                >
                  {a.publishStatus === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteMutation.mutate(a.id)} className="p-1.5 hover:bg-danger/10 text-danger rounded-lg transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Announcement" size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.categoryId}>Publish</Button>
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
            <textarea className="input-field" rows={3} placeholder="Brief description shown on the kiosk…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Status</label>
            <select className="input-field" value={form.publishStatus} onChange={e => setForm(f => ({ ...f, publishStatus: e.target.value }))}>
              <option value="published">Published (visible on kiosk)</option>
              <option value="unpublished">Unpublished (draft)</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal open={showAddCat} onClose={() => setShowAddCat(false)} title="New Category" size="sm"
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
