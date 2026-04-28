import { useState, useRef, useCallback } from 'react';
import { X, ImageIcon, Loader2, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus } from '../types';
import { getDaysFromNow, getTomorrowISO } from '../utils/taskUtils';

interface ExtractedTaskPlan {
  taskTitle: string;
  milestones: string[];
}

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

function extractTextFromResponse(data: OpenAIResponse): string {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text!.trim())
    .filter(Boolean);

  return chunks.join('\n').trim();
}

interface ImageUploadExtractorProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (task: Partial<Task>) => void;
}

const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue'];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageUploadExtractor({ isOpen, onClose, onImport }: ImageUploadExtractorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [milestones, setMilestones] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(getTomorrowISO());
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.match(/image\/(png|jpeg|webp)/)) {
      setError('Please upload a PNG, JPEG, or WebP image.');
      return;
    }
    setFile(f);
    setError(null);
    setSuggestedTitle('');
    setTaskTitle('');
    setMilestones([]);
    setDueDate(getTomorrowISO());
    setStatus('Pending');
    setSuccess(false);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('Missing OpenAI API key. Add VITE_OPENAI_API_KEY to your .env file.');
      }

      const base64 = await toBase64(file);
      const today = new Date();
      const defaultDue = getDaysFromNow(3);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          text: {
            format: {
              type: 'json_schema',
              name: 'task_plan',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  taskTitle: { type: 'string' },
                  milestones: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['taskTitle', 'milestones'],
              },
            },
          },
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `Read this image and extract a task plan. Return ONLY valid JSON and no markdown.
Required JSON shape:
{
  "taskTitle": "string",
  "milestones": ["string", "string"]
}
Rules:
- taskTitle should use the main heading/title from the image if present.
- milestones should be all checklist/todo/milestone lines found in the image.
- If no clear heading exists, use "Imported Task".
- If no milestones exist, return an empty array.
- Do not include numbering prefixes in milestone text.
- Today is ${today.toISOString().split('T')[0]}. If dates are present in milestones, keep them in text.`,
                },
                {
                  type: 'input_image',
                  image_url: `data:${file.type};base64,${base64}`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: { message?: string } }).error?.message ?? `OpenAI API error ${response.status}`);
      }

      const data = (await response.json()) as OpenAIResponse;
      const raw = extractTextFromResponse(data);

      if (!raw.trim()) {
        throw new Error('The model returned an empty result. Please try again.');
      }

      const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as ExtractedTaskPlan;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Could not parse extracted task plan.');
      }

      const normalizedMilestones = Array.isArray(parsed.milestones)
        ? parsed.milestones
            .map((m) => m.trim())
            .filter(Boolean)
        : [];

      const extractedTitle = parsed.taskTitle?.trim() || 'Imported Task';
      setSuggestedTitle(extractedTitle);
      setTaskTitle(extractedTitle);
      setMilestones(normalizedMilestones);
      setDueDate(defaultDue);
      setStatus('Pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract milestones. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function updateMilestone(idx: number, value: string) {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? value : m)));
  }

  function removeMilestone(idx: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, '']);
  }

  function handleCreateTask() {
    const finalTitle = taskTitle.trim() || suggestedTitle || 'Imported Task';
    const finalMilestones = milestones
      .map((m) => m.trim())
      .filter(Boolean)
      .map((title) => ({ title }));

    onImport({
      title: finalTitle,
      dueDate,
      status,
      milestones: finalMilestones,
    });

    setSuccess(true);
    setTimeout(() => {
      resetState();
      onClose();
    }, 1500);
  }

  function resetState() {
    setFile(null);
    setPreview(null);
    setSuggestedTitle('');
    setTaskTitle('');
    setMilestones([]);
    setDueDate(getTomorrowISO());
    setStatus('Pending');
    setError(null);
    setLoading(false);
    setSuccess(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Sparkles size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800 text-base" style={{ fontFamily: 'Syne, sans-serif' }}>
                Import Tasks from Image
              </h2>
              <p className="text-xs text-stone-400">AI-powered task extraction</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Upload Zone */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                dragging
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-stone-50'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                dragging ? 'bg-indigo-100' : 'bg-white shadow-sm border border-stone-200'
              }`}>
                <ImageIcon size={26} className={dragging ? 'text-indigo-500' : 'text-stone-400'} />
              </div>
              <p className="text-sm font-semibold text-stone-700 mb-1">
                Drop an image of your to-do list here
              </p>
              <p className="text-xs text-stone-400 mb-4">or click to browse</p>
              <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">
                PNG · JPEG · WebP
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="relative group rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
              <img src={preview} alt="Uploaded" className="w-full max-h-64 object-contain bg-stone-50" />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setSuggestedTitle('');
                  setTaskTitle('');
                  setMilestones([]);
                  setDueDate(getTomorrowISO());
                  setStatus('Pending');
                  setError(null);
                }}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm border border-stone-200 text-stone-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-4 py-3">
                <p className="text-white text-xs font-medium truncate">{file?.name}</p>
              </div>
            </div>
          )}

          {/* Extract Button */}
          {file && milestones.length === 0 && !success && (
            <button
              onClick={handleExtract}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-70 text-white font-semibold rounded-xl py-3.5 transition-all duration-200 shadow-md shadow-indigo-200 hover:shadow-indigo-300"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analysing your image…
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Extract Milestones
                </>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                Task created successfully!
              </p>
            </div>
          )}

          {/* Extracted Task Plan */}
          {milestones.length > 0 && !success && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-700">
                  Extracted Milestones
                  <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                    {milestones.length}
                  </span>
                </h3>
                <p className="text-xs text-stone-400">Edit before importing</p>
              </div>

              <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-800 font-medium"
                    placeholder="Task title"
                  />
                  {suggestedTitle && (
                    <p className="mt-1 text-xs text-stone-400">
                      Suggested from image heading: {suggestedTitle}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 text-stone-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 text-stone-600 cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  {milestones.map((milestone, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        type="text"
                        value={milestone}
                        onChange={(e) => updateMilestone(i, e.target.value)}
                        className="flex-1 text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-stone-800"
                        placeholder="Milestone title"
                      />
                      <button
                        onClick={() => removeMilestone(i)}
                        className="p-2 text-stone-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addMilestone}
                  className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                >
                  <Plus size={14} />
                  Add Milestone
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {milestones.length > 0 && !success && (
          <div className="px-6 py-4 border-t border-stone-100 space-y-2">
            <button
              onClick={handleCreateTask}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl py-3.5 transition-all duration-200 shadow-md shadow-indigo-200"
            >
              <Plus size={18} />
              Create Task with Milestones
            </button>
            <button
              onClick={() => { setMilestones([]); setError(null); }}
              className="w-full text-sm text-stone-400 hover:text-stone-600 py-2 transition-colors"
            >
              Re-extract
            </button>
          </div>
        )}

        {milestones.length === 0 && file && !loading && !success && (
          <div className="px-6 py-4 border-t border-stone-100">
            <p className="text-xs text-stone-400 text-center">
              Upload an image of a checklist or milestone list
            </p>
          </div>
        )}
      </div>
    </>
  );
}
