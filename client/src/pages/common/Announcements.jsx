import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import { Megaphone, Plus, Trash2, X, AlertCircle } from 'lucide-react';

export default function Announcements() {
  const { user } = useAuth();
  const canPost = user?.role === 'admin' || user?.role === 'hr';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    targetRoles: 'all',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      setSuccess('Announcement published to all dashboards');
      setShowPostModal(false);
      setForm({ title: '', content: '', priority: 'normal', targetRoles: 'all' });
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to post announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setSuccess('Announcement archived');
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to archive');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Company Announcements</h2>
          <p className="text-xs text-slate-500">Feature 23: Broadcast organization notices and alerts to workforce dashboards</p>
        </div>

        {canPost && (
          <Button
            variant="primary"
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Post Announcement</span>
          </Button>
        )}
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      <div className="space-y-4">
        {loading ? (
          <Spinner />
        ) : announcements.length === 0 ? (
          <Card className="py-12 text-center text-slate-400 text-sm">
            No announcements currently active.
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a._id} className="p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-indigo-600" />
                  <span className="font-bold text-base text-slate-900">{a.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      a.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : a.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {a.priority}
                  </span>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Archive Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{a.content}</p>

              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
                <span>By {a.authorName} ({a.authorRole.toUpperCase()})</span>
                <span>{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))
        )}
      </div>

      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Post Announcement</h3>
              <button onClick={() => setShowPostModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Annual Eid Holidays & Bonus Announcement"
                  required
                />
              </Field>

              <Field label="Priority Level">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Field>

              <Field label="Content">
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Detailed announcement content..."
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowPostModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Publish Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
