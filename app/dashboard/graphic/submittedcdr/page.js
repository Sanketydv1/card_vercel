"use client";
import React, { useEffect, useState } from "react";
import { Eye, Pencil, CloudUpload, Check, PackageCheck } from "lucide-react";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axios from "../../../../lib/axiosConfig";
import { getImageUrl } from '@/lib/imageUrl';

export default function SubmittedCDRPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");
    const MAX_FILES = 5;

    // modal for viewing submitted CDR details (also used for editing)
    const [showModal, setShowModal] = useState(false);
    const [modalGraphic, setModalGraphic] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [editingCdr, setEditingCdr] = useState(null); // { graphicId, cdrId }
    const [uploading, setUploading] = useState(false);
    const [uploadedBatches, setUploadedBatches] = useState([]); // groups of uploaded files per upload action
    const [uploadCompleted, setUploadCompleted] = useState(false);
    const [modalDriveLink, setModalDriveLink] = useState('');

    const openEditModal = (g) => {
        setModalGraphic(g);
        setIsEditing(true);
        setShowModal(true);
        setSelectedFiles([]);
        setEditingCdr(null);
        setUploadCompleted(false);
        setModalDriveLink('');
        document.body.style.overflow = 'hidden';
    };

    const openModal = (g) => {
        setModalGraphic(g);
        setIsEditing(false);
        setShowModal(true);
        setUploadCompleted(false);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setShowModal(false);
        setModalGraphic(null);
        setIsEditing(false);
        setSelectedFiles([]);
        setEditingCdr(null);
        setUploadCompleted(false);
        setModalDriveLink('');
        document.body.style.overflow = '';
    };

    const onFilePicked = (files) => {
        if (!files) return;
        setUploadCompleted(false);
        const arr = Array.from(files).slice(0, MAX_FILES);
        const mapped = arr.map(file => ({ file, progress: 0, status: 'pending' }));
        setSelectedFiles(prev => {
            const next = [...prev, ...mapped].slice(0, MAX_FILES);
            return next;
        });
    };

    const onReplaceFilePicked = (files, cdrId) => {
        if (!files) return;
        setUploadCompleted(false);
        const file = Array.from(files)[0];
        if (!file) return;
        setSelectedFiles([{ file, progress: 0, status: 'pending' }]);
        setEditingCdr({ graphicId: modalGraphic?.graphic?._id, cdrId });
    };

    const startUpload = async () => {
        if (!selectedFiles.length || !modalGraphic) return;
        setUploading(true);

        // group uploads performed in this action into a batch
        const batch = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const item = selectedFiles[i];
            if (item.status === 'uploaded') continue;

            setSelectedFiles(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading', progress: 5 } : it));

            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    setSelectedFiles(prev => prev.map((it, idx) => {
                        if (idx !== i) return it;
                        const next = Math.min(95, it.progress + Math.floor(Math.random() * 20) + 10);
                        return { ...it, progress: next };
                    }));
                }, 300);

                setTimeout(async () => {
                    clearInterval(interval);
                    try {
                        // upload file to server
                        const fd = new FormData();
                        fd.append('uploadFile', item.file);
                        const upRes = await axios.post('/api/upload', fd);
                        const saved = upRes.data?.files?.[0];
                        if (!saved) throw new Error('Upload failed');
                        const filename = saved.filename;

                        let res;
                        if (editingCdr && editingCdr.cdrId) {
                            // replace specific cdr
                            res = await axios.put(`/api/graphic/${editingCdr.graphicId}`, { cdrId: editingCdr.cdrId, uploadCdr: filename });
                        } else {
                            // append new cdr to the graphic's sale
                            const payload = { sales: modalGraphic?._id, uploadCdr: filename };
                            res = await axios.post('/api/graphic', payload);
                        }

                        // mark as uploaded and record into current batch
                        setSelectedFiles(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploaded', uploadedCdr: filename, progress: 100 } : it));
                        const replacedId = editingCdr && editingCdr.cdrId ? editingCdr.cdrId : null;
                        batch.push({ name: item.file.name, uploadedCdr: filename, replacedCdrId: replacedId });

                        // refresh the list and modalGraphic
                        try {
                            const graphicRes = await axios.get('/api/graphic?type=submitted');
                            const orders = graphicRes.data?.data || [];
                            // find updated order for modal
                            const newO = orders.find(x => x._id === (modalGraphic && modalGraphic._id)) || null;
                            setModalGraphic(newO);
                            // update items in the page
                            setItems(orders);
                        } catch (e) {
                            // ignore refresh errors
                        }

                    } catch (err) {
                        console.error(err);
                        const message = err?.response?.data?.message || err?.message || 'Upload failed';
                        setSelectedFiles(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: message } : it));
                    }
                    // clear editingCdr after replace (per-file)
                    setEditingCdr(null);
                    resolve();
                }, 1200 + Math.floor(Math.random() * 900));
            });
        }

        setUploading(false);

        // if we uploaded anything, add this batch to the UI and clear selected files
        if (batch.length) {
            setUploadedBatches(prev => [batch, ...prev]);
            setSelectedFiles([]);
            setEditingCdr(null);
            setUploadCompleted(true);
        }

        // final refresh of all submitted graphics so UI shows all cdrs
        try {
            const graphicRes = await axios.get('/api/graphic?type=submitted');
            const orders = graphicRes.data?.data || [];
            setItems(orders);
            const newO = orders.find(x => x._id === (modalGraphic && modalGraphic._id)) || null;
            setModalGraphic(newO);
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        axios
            .get("/api/graphic?type=submitted")
            .then((res) => {
                if (!mounted) return;
                setItems(res.data?.data || []);
            })
            .catch((err) => setError(err?.message || "Failed to load"))
            .finally(() => setLoading(false));

        return () => (mounted = false);
    }, []);

    // Listen for submitted-graphic events so the list refreshes immediately when a re-uploaded CDR is submitted
    useEffect(() => {
        const handler = async (e) => {
            try {
                if (e?.detail?.graphic) {
                    const gfx = e.detail.graphic;
                    setItems(prev => {
                        if (!prev || !Array.isArray(prev)) return [gfx];
                        if (prev.find(x => x._id === gfx._id)) return prev;
                        return [gfx, ...prev];
                    });
                } else {
                    const res = await axios.get('/api/graphic?type=submitted');
                    setItems(res.data?.data || []);
                }
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener('submitted-graphic', handler);
        return () => window.removeEventListener('submitted-graphic', handler);
    }, []);

    const submitted = items; // show all uploaded CDRs (graphics have no status now)

    // Pagination & search
    const filteredSubmitted = (submitted || []).filter(s => JSON.stringify(s).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filteredSubmitted.length / itemsPerPage));
    const displayedSubmitted = filteredSubmitted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">Submitted CDR</h2>

                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm text-center">
                    <thead className="button-gradient-reverse text-white">
                        <tr>
                            <th className="px-6 py-3 text-center">Design Name</th>
                            <th className="px-6 py-3 text-center">Card Photo</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-2 text-center">
                                    Loading...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-2 text-center text-red-600">
                                    {error}
                                </td>
                            </tr>
                        ) : submitted.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No submitted CDRs found.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayedSubmitted.map((order) => (
                                <tr
                                    key={order._id}
                                    className="border-b hover:bg-gray-50"
                                >
                                    <td className="px-6 py-2 text-center align-middle">
                                        {order.designName || "—"}
                                    </td>

                                    <td className="px-6 py-2 text-center align-middle">
                                        <button
                                            onClick={() => openModal(order)}
                                            aria-label="View CDR details"
                                            className="inline-flex items-center justify-center text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]"
                                        >
                                            <Eye size={18} className="cursor-pointer" />
                                        </button>
                                    </td>

                                    <td className="px-6 py-2 text-center align-middle">
                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                            {order.uiStatus || "Submitted"}
                                        </span>
                                    </td>

                                    <td className="px-6 py-2 text-center align-middle">
                                        <div className="flex justify-center items-center gap-3">
                                            <button
                                                onClick={() => openEditModal(order)}
                                                title="Edit"
                                                className="inline-flex items-center justify-center text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]"
                                            >
                                                <Pencil size={18} className="cursor-pointer" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

            </div>

            {/* Modal for submitted CDR preview */}
            {showModal && modalGraphic ? (
                <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[520px] max-w-full rounded-lg shadow-xl max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center px-4 mt-3">
                            <h3 className="text-lg font-semibold">Uploaded CDR</h3>
                            <button onClick={closeModal} className="text-gray-600 font-bold">✕</button>
                        </div>

                        <div className="p-4">
                            {!isEditing && (
                                <div className="mb-4">
                                    <img src={modalGraphic.cardPhoto ? (typeof modalGraphic.cardPhoto === 'string' && !modalGraphic.cardPhoto.startsWith('data:') ? getImageUrl(modalGraphic.cardPhoto) : modalGraphic.cardPhoto) : ''} alt="card preview" className="w-full h-48 object-fit rounded-lg" />
                                    <p className="text-center mt-2 text-sm text-gray-600">Design Name : <strong>{modalGraphic.designName}</strong></p>
                                </div>
                            )}

                            <div className="mb-3">
                                {isEditing ? (
                                    <div className="mt-2">
                                        {uploading ? (
                                            // show only progress while uploading
                                            <div className="flex flex-col gap-2">
                                                {selectedFiles.map((it, idx) => (
                                                    <div key={idx} className="flex flex-col p-2 bg-white rounded border">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <CloudUpload size={18} />
                                                                <div>
                                                                    <div className="text-sm font-medium">{it.file.name}</div>
                                                                    <div className="text-xs text-gray-500">{(it.file.size / 1024).toFixed(0)} KB</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {it.status === 'uploaded' ? <Check className="text-green-600" /> : null}
                                                                <div className="text-sm text-gray-700">{it.progress ? `${it.progress}%` : ''}</div>
                                                            </div>
                                                        </div>
                                                        {it.progress ? (
                                                            <div className="w-full mt-2">
                                                                <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                                                    <div style={{ width: `${it.progress}%` }} className="h-full bg-blue-600" />
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                {/* Upload area for adding new CDRs */}
                                                <div onDrop={(e) => { e.preventDefault(); onFilePicked(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()} className="border rounded p-4 mt-3">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="text-center w-full">
                                                            <div className="my-4 text-gray-600 flex flex-col items-center">
                                                                <CloudUpload size={48} className="text-gray-400" />
                                                                <div className="mt-2 text-sm">Choose a file or drag & drop it here</div>
                                                            </div>
                                                        </div>

                                                        <div className="w-full">
                                                            <div className="flex items-center gap-2">
                                                                <input id="add-cdr-file" type="file" multiple className="hidden" onChange={(e) => onFilePicked(e.target.files)} disabled={modalDriveLink.trim().length > 0} />
                                                                <label htmlFor="add-cdr-file" className={`px-4 py-1 border rounded cursor-pointer ${modalDriveLink.trim().length > 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white'}`}>Browse File</label>
                                                                <div className="flex-1 text-sm text-gray-600">{selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'no file selected'}</div>
                                                                <button disabled={!selectedFiles.length || uploading || uploadCompleted || modalDriveLink.trim().length > 0} onClick={startUpload} className={`px-3 py-1 rounded ${(!selectedFiles.length || uploading || uploadCompleted || modalDriveLink.trim().length > 0) ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'}`}>
                                                                    {uploadCompleted ? 'Uploaded' : 'Upload Files'}
                                                                </button>
                                                            </div>

                                                            <div className="mt-3 flex flex-col gap-2">
                                                                {selectedFiles.map((it, idx) => (
                                                                    <div key={idx} className="flex flex-col p-3 bg-gray-100 rounded">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 bg-white rounded flex items-center justify-center border"><CloudUpload size={18} className="text-blue-600" /></div>
                                                                                <div>
                                                                                    <div className="text-sm font-medium">{it.file.name}</div>
                                                                                    <div className="text-xs text-gray-500">{(it.file.size / 1024).toFixed(0)} KB</div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                {it.status === 'uploaded' ? <Check className="text-green-600" /> : null}
                                                                                <button onClick={() => setSelectedFiles(prev => { setUploadCompleted(false); return prev.filter((_, i) => i !== idx); })} className="text-sm text-red-600">Remove</button>
                                                                            </div>
                                                                        </div>
                                                                        {/* progress bar overlay */}
                                                                        {it.progress ? (
                                                                            <div className="w-full mt-3">
                                                                                <div className="w-full h-3 bg-gray-200 rounded overflow-hidden">
                                                                                    <div style={{ width: `${it.progress}%` }} className="h-full bg-blue-600" />
                                                                                </div>
                                                                            </div>
                                                                        ) : null}
                                                                        {it.status === 'error' ? <div className="text-xs text-red-600 mt-1">{it.error || 'Upload failed'}</div> : null}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {uploadCompleted ? (
                                                                <div className="mt-3 p-3 bg-green-50 rounded text-green-700 flex items-center gap-2">
                                                                    <Check /> Upload successful
                                                                </div>
                                                            ) : null}

                                                            <div className="mt-3">
                                                                <label className="text-xs text-gray-600">Drive Link</label>
                                                                <div className="flex gap-2 mt-1">
                                                                    <input disabled={selectedFiles.length > 0} value={modalDriveLink} onChange={(e) => setModalDriveLink(e.target.value)} placeholder="Paste drive link here" className={`flex-1 px-3 py-2 border rounded text-sm ${selectedFiles.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} />
                                                                    <button disabled={!modalDriveLink.trim() || uploading || selectedFiles.length > 0} onClick={async () => {
                                                                        if (!modalGraphic) return;
                                                                        try {
                                                                            setUploading(true);
                                                                            const payload = { sales: modalGraphic?._id, driveLink: modalDriveLink };
                                                                            const res = await axios.post('/api/graphic', payload);
                                                                            setModalGraphic(res.data.data);
                                                                            setModalDriveLink('');
                                                                            // refresh list
                                                                            try { const graphicRes = await axios.get('/api/graphic?type=submitted'); setItems(graphicRes.data?.data || []); } catch (e) { }
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                            setError(err?.response?.data?.message || err?.message || 'Submit link failed');
                                                                        } finally {
                                                                            setUploading(false);
                                                                        }
                                                                    }} className={`px-3 py-2 rounded text-white ${!modalDriveLink.trim() || uploading || selectedFiles.length > 0 ? 'bg-gray-300 text-gray-600' : 'bg-green-600'}`}>Submit Link</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Uploaded batches (grouped by upload action) */}
                                                {uploadedBatches.length > 0 && (
                                                    <div className="mt-2 flex flex-col gap-2">
                                                        {uploadedBatches.map((batch, bIdx) => (
                                                            <div key={bIdx} className="p-2 bg-green-50 rounded border">
                                                                <div className="text-sm font-medium text-gray-800">Uploaded {batch.length} file{batch.length > 1 ? 's' : ''}:</div>
                                                                <div className="mt-1 flex flex-col gap-1">
                                                                    {batch.map((it, idx) => (
                                                                        <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                                                            <Check className="text-green-600" />
                                                                            <div>{it.name}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex flex-col gap-2 mb-3 mt-4">
                                                    {(modalGraphic.graphic?.cdrs || []).map((c, i) => (
                                                        <div key={c._id} className="flex flex-col gap-1 p-2 bg-gray-50 rounded border">
                                                            {/* File upload row */}
                                                            {c.uploadCdr && (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="text-xs text-gray-700">File: {typeof c.uploadCdr === 'string' ? c.uploadCdr.split('/').pop() : `CDR ${i + 1}`}</div>
                                                                    <a href={typeof c.uploadCdr === 'string' && !c.uploadCdr.startsWith('http') && !c.uploadCdr.startsWith('data:') ? getImageUrl(c.uploadCdr) : c.uploadCdr} download className="px-2 py-0 border rounded text-xs text-blue-600 bg-white hover:bg-blue-50">Download</a>
                                                                </div>
                                                            )}
                                                            {/* Drive link row */}
                                                            {c.driveLink && (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="text-xs text-gray-700">Link: {c.driveLink.substring(0, 30)}...</div>
                                                                    <div className="flex gap-1">
                                                                        <button onClick={() => window.open(c.driveLink, '_blank')} className="px-2 py-0 border rounded text-xs text-green-600 bg-white hover:bg-green-50">Open</button>
                                                                        <button onClick={() => { navigator.clipboard.writeText(c.driveLink); alert('Link copied'); }} className="px-2 py-0 border rounded text-xs text-green-600 bg-white hover:bg-green-50">Copy</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {!c.uploadCdr && !c.driveLink && (
                                                                <div className="text-xs text-gray-500">No file or link</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        {/* Only showing photo and design name in view mode */}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            ) : null}

            {/* Pagination */}
            <div className="flex justify-end gap-2 p-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
            </div>
        </div>
    );
}

/* ---------- Reusable UI ---------- */

const th = ({ children }) => (
    <th className="px-4 py-2 text-left font-medium">{children}</th>
);

const td = ({ children, className = "", ...props }) => (
    <td className={`px-4 py-2 ${className}`} {...props}>{children}</td>
);

/* PageBtn removed — use shared Pagination component */
