"use client";
import React, { useEffect, useState } from "react";
import { Eye, CloudUpload, Check, PackageCheck } from "lucide-react";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axios from "../../../../lib/axiosConfig";
import { getImageUrl } from '@/lib/imageUrl';
// import { PDFDocument, StandardFonts } from 'pdf-lib';

export default function PendingCDRPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        axios
            .get('/api/graphic?type=pending')
            .then((res) => {
                if (!mounted) return;
                const pendingOrders = res.data?.data || [];
                setItems(pendingOrders);
            })
            .catch((err) => setError(err?.message || "Failed to load"))
            .finally(() => setLoading(false));

        return () => (mounted = false);
    }, []);

    const pending = {
        sales: items || [],
        graphics: []
    };

    // Items are already filtered pending orders from the API
    const pendingList = items || [];

    // Pagination & search (client-side)
    const filteredPendingList = (pendingList || []).filter(s => JSON.stringify(s).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filteredPendingList.length / itemsPerPage));
    const displayedPendingList = filteredPendingList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Modal + upload state
    const [showCardModal, setShowCardModal] = useState(false);
    const [showCdrModal, setShowCdrModal] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [modalSale, setModalSale] = useState(null);
    const [attachmentModalSale, setAttachmentModalSale] = useState(null);
    const [modalCdrMode, setModalCdrMode] = useState("preview"); // 'preview' | 'upload' | 'edit'
    const [showUploadArea, setShowUploadArea] = useState(false);
    const [modalGraphic, setModalGraphic] = useState(null); // single graphic doc for the opened sale


    // Selected files for upload: { file, progress, status, uploadedCdr }
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadedGraphics, setUploadedGraphics] = useState([]); // created Graphic records in this modal session
    const [hiddenExistingIds, setHiddenExistingIds] = useState([]); // existing CDRs hidden from view (UI-only)
    const [uploadCompleted, setUploadCompleted] = useState(false);

    // Max files allowed per upload session
    const MAX_FILES = 5;

    const downloadUrlAsFile = async (url, filename) => {
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Failed to fetch file');
            const blob = await resp.blob();
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = filename || '';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(dlUrl);
        } catch (err) {
            console.error('Download failed', err);
            window.open(url, '_blank');
        }
    };

    // Card preview modal handlers
    const openCardModal = (sale) => {
        setModalSale(sale);
        setShowCardModal(true);
        document.body.style.overflow = 'hidden';
        // pre-load related graphic for quick decision on CDR
        setModalGraphic(sale.graphic || null);
    };

    const closeCardModal = () => {
        setShowCardModal(false);
        setModalSale(null);
        document.body.style.overflow = '';
        setModalGraphic(null);
    };

    // Attachment modal handlers
    const openAttachmentModal = (sale) => {
        setAttachmentModalSale(sale);
        setShowAttachmentModal(true);
        document.body.style.overflow = 'hidden';
    };

    const closeAttachmentModal = () => {
        setShowAttachmentModal(false);
        setAttachmentModalSale(null);
        document.body.style.overflow = '';
    };

    // CDR modal handlers
    const openCdrModal = (sale, mode = 'preview') => {
        setModalSale(sale);
        setModalCdrMode(mode);
        setShowCdrModal(true);
        document.body.style.overflow = 'hidden';
        // reset per-modal lists (UI-only)
        setSelectedFiles([]);
        setUploadedGraphics([]);
        setHiddenExistingIds([]);
        setUploadCompleted(false);
        setShowUploadArea(mode === 'upload' || mode === 'edit');
        // set modalGraphic from sale's graphic
        setModalGraphic(sale.graphic || null);

    };

    const closeCdrModal = () => {
        setShowCdrModal(false);
        setModalSale(null);
        setModalCdrMode('preview');
        setShowUploadArea(false);
        setUploadCompleted(false);
        document.body.style.overflow = '';
        setModalGraphic(null);
    };

    const onFilePicked = (files) => {
        if (!files) return;
        // selecting new files re-enables submit
        setUploadCompleted(false);
        const arr = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.cdr')).slice(0, MAX_FILES);
        const mapped = arr.map(file => ({ file, progress: 0, status: 'pending', uploadedCdr: null }));
        setSelectedFiles(prev => {
            const next = [...prev, ...mapped].slice(0, MAX_FILES);
            return next;
        });
    };

    const startUpload = async () => {
        if (!selectedFiles.length || !modalSale) return;
        setUploading(true);
        let successCount = 0;

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

                        // create graphic record pointing to filename
                        const payload = { sales: modalSale._id, uploadCdr: filename };
                        const res = await axios.post('/api/graphic', payload);

                        setSelectedFiles(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploaded', uploadedCdr: filename, progress: 100 } : it));
                        setUploadedGraphics(prev => [...prev, res.data.data]);
                        successCount++;
                        // update modalGraphic
                        setModalGraphic(res.data.data);

                        // If this sale was a Re-Upload (orderStatus === 'notApproved'), remove it immediately from pending UI
                        if (modalSale?.orderStatus === 'notApproved') {
                            setItems(prev => prev.filter(p => p._id !== modalSale._id));
                            // notify submitted page to add this graphic to its list (server may still keep orderStatus 'notApproved')
                            try {
                                window.dispatchEvent(new CustomEvent('submitted-graphic', { detail: { saleId: modalSale._id, graphic: res.data.data } }));
                            } catch (e) {
                                // ignore
                            }
                        }

                        try {
                            const graphicRes = await axios.get('/api/graphic?type=pending');
                            setItems(graphicRes.data?.data || []);
                        } catch (e) {
                            // ignore refresh errors
                        }
                    } catch (err) {
                        console.error(err);
                        const message = err?.response?.data?.message || err?.message || 'Upload failed';
                        setSelectedFiles(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: message } : it));
                    }

                    resolve();
                }, 1200 + Math.floor(Math.random() * 900));
            });
        }
        setUploading(false);
        // Refresh list by reloading pending graphics
        try {
            const graphicRes = await axios.get('/api/graphic?type=pending');
            const pendingOrders = graphicRes.data?.data || [];
            // update local state quickly
            setItems(pendingOrders);
            // update modal graphics for the current sale and hide upload area if a CDR now exists
            const newGfx = pendingOrders.find(ord => ord._id === modalSale._id);
            // set modalGraphic to the graphic for the sale if it exists
            setModalGraphic(newGfx?.graphic || null);
            if (newGfx?.graphic) {
                setShowUploadArea(false);
            }
        } catch (e) {
            // ignore refresh errors
        }

        // mark upload completed if at least one file uploaded successfully
        if (successCount > 0) setUploadCompleted(true);
    };

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">CDR Upload Pending</h2>

                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="justify-content-center button-gradient-reverse">
                        <tr>
                            <th className="px-6 py-3 text-center">Design Name</th>
                            <th className="px-6 py-3 text-center">Card Photo</th>
                            <th className="px-6 py-3 text-center">Attached File</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Upload CDR</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center">Loading...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="text-center text-red-600">{error}</td>
                            </tr>
                        ) : pendingList.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No pending CDR uploads.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <>
                                {displayedPendingList.map((s) => (
                                    <tr key={s._id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-2 text-center align-middle">
                                            {s.designName}
                                        </td>

                                        <td className="px-6 py-2 text-center align-middle">
                                            <button
                                                onClick={() => openCardModal(s)}
                                                aria-label="View card preview"
                                                className="inline-flex justify-center text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]"
                                            >
                                                <Eye size={18} className="cursor-pointer" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-3 text-center align-middle">
                                            {s.orderStatus === 'notApproved' && s.emailCommunications && s.emailCommunications.length > 0 && s.emailCommunications.some(ec => ec.attachments && ec.attachments.length > 0) ? (
                                                <button onClick={() => openAttachmentModal(s)} className="inline-flex justify-center text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]">
                                                    <Eye size={18} className="cursor-pointer" />
                                                </button>
                                            ) : (
                                                <span className="text-gray-500">N/A</span>
                                            )}
                                        </td>


                                        <td className="px-6 py-2 text-center align-middle">
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                                {s.uiStatus || "Pending"}
                                            </span>
                                        </td>

                                        <td className="px-6 py-2 text-center align-middle">
                                            <div className="flex justify-center items-center gap-3">
                                                <button
                                                    onClick={() => openCdrModal(s, 'upload')}
                                                    title="Upload CDR"
                                                    className="inline-flex justify-center"
                                                >
                                                    <CloudUpload size={22} className="cursor-pointer text-gray-700" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Card preview modal */}
            {showCardModal && modalSale ? (
                <div onClick={closeCardModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[520px] max-w-full rounded-lg shadow-xl max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center p-4">
                            <h3 className="font-medium">Card Preview</h3>
                            <button onClick={closeCardModal} className="text-gray-600">✕</button>
                        </div>

                        <div className="p-4">
                            <div className="mb-4">
                                <img src={modalSale.cardPhoto ? (typeof modalSale.cardPhoto === 'string' && !modalSale.cardPhoto.startsWith('data:') ? getImageUrl(modalSale.cardPhoto) : modalSale.cardPhoto) : ''} alt="card preview" className="w-82 h-44 object-fit rounded-lg" />
                                <p className="text-center mt-2 text-sm text-gray-600">Design Name : <strong>{modalSale.designName}</strong></p>
                            </div>

                            <div className="text-center">
                                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => { closeCardModal(); openCdrModal(modalSale, 'upload'); }}>
                                    {modalSale.orderStatus === 'notApproved' ? 'Re-upload CDR' : 'Upload CDR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* CDR management modal */}
            {showCdrModal && modalSale ? (
                <div onClick={closeCdrModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[520px] max-w-full rounded-lg shadow-xl max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center px-4 mt-4">
                            <h3 className="font-medium">CDR Management</h3>
                            <button onClick={closeCdrModal} className="text-gray-600">✕</button>
                        </div>

                        <div className="p-4">

                            {/* Upload area (for new CDRs) */}
                            {(modalCdrMode === 'upload' || showUploadArea) ? (
                                <div onDrop={(e) => { e.preventDefault(); onFilePicked(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()} className="border rounded p-4">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-center w-full">
                                            <h3 className="text-lg font-semibold">{modalSale?.orderStatus === 'notApproved' ? 'Re-upload CDR' : 'Upload CDR'}</h3>
                                            <div className="my-4 text-gray-600 flex flex-col items-center">
                                                <CloudUpload size={48} className="text-gray-400" />
                                                <div className="mt-2 text-sm">Choose a CDR or drag & drop it here</div>
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <div className="flex items-center gap-2">
                                                <input id="cdr-file-input" type="file" multiple accept=".cdr" className="hidden" onChange={(e) => onFilePicked(e.target.files)} />
                                                <label htmlFor="cdr-file-input" className="px-4 py-1 border rounded cursor-pointer bg-white">Browse File</label>
                                                <div className="text-sm text-gray-600">{selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'no cdr selected'}</div>
                                            </div>

                                            {/* selected files list */}
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
                                                                <button onClick={() => { setUploadCompleted(false); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }} className="text-sm text-red-600">Remove</button>
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

                                            <div className="mt-4">
                                                <div className="flex items-center justify-center">
                                                    <button disabled={!selectedFiles.length || uploading || uploadCompleted} onClick={startUpload} className={`px-6 py-2 rounded ${(!selectedFiles.length || uploading || uploadCompleted) ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'}`}>
                                                        {uploadCompleted ? 'Submitted' : 'Submit'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Existing CDRs list */}
                            {modalGraphic?.cdrs && modalGraphic.cdrs.length > 0 ? (
                                <div className=" mt-3 mb-4 p-3 bg-gray-50 rounded border">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Previously Submitted CDRs:</h4>
                                    <div className="flex flex-col gap-2">
                                        {modalGraphic.cdrs.map((c, i) => (
                                            <div key={c._id} className="flex items-center justify-between p-2 bg-white rounded border">
                                                <div className="text-xs text-gray-700">{c.uploadCdr ? (typeof c.uploadCdr === 'string' ? c.uploadCdr.split('/').pop() : 'CDR') : `CDR ${i + 1}`}</div>
                                                <button onClick={() => {
                                                    const url = c.uploadCdr ? (typeof c.uploadCdr === 'string' && !c.uploadCdr.startsWith('http') && !c.uploadCdr.startsWith('data:') ? getImageUrl(c.uploadCdr) : c.uploadCdr) : null;
                                                    const fname = c.uploadCdr && typeof c.uploadCdr === 'string' ? c.uploadCdr.split('/').pop() : 'CDR';
                                                    downloadUrlAsFile(url, fname);
                                                }} className="px-2 py-1 border rounded text-xs text-blue-600 bg-blue-50 hover:bg-blue-100">Download</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Attachment modal */}
            {showAttachmentModal && attachmentModalSale ? (
                <div onClick={closeAttachmentModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[520px] max-w-full rounded-lg shadow-xl max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center p-4">
                            <h3 className="font-medium">Attachment Details</h3>
                            <button onClick={closeAttachmentModal} className="text-gray-600">✕</button>
                        </div>
                        <div className="p-4">
                            {(() => {
                                const latestEmail = attachmentModalSale.emailCommunications?.[attachmentModalSale.emailCommunications.length - 1];
                                return (
                                    <>
                                        <div className="mb-4">
                                            <h4 className="font-semibold">Message:</h4>
                                            <p>{latestEmail?.message || 'No message'}</p>
                                        </div>
                                        {latestEmail?.attachments && latestEmail.attachments.length > 0 ? (
                                            <div>
                                                <h4 className="font-semibold mb-2">Photos:</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {latestEmail.attachments.map((att, idx) => {
                                                        const url = (typeof att === 'string' && !att.startsWith('http') && !att.startsWith('data:')) ? getImageUrl(att) : att;
                                                        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(att);
                                                        if (isImage) {
                                                            return <img key={idx} src={url} alt={`Attachment ${idx}`} className="w-24 h-24 object-cover rounded" />;
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                );
                            })()}
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

