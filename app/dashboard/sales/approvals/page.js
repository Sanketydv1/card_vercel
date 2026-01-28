"use client";
import React, { useEffect, useState } from "react";
import axios from "../../../../lib/axiosConfig";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import { Download, Upload, PackageCheck } from "lucide-react";
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/imageUrl';
import JSZip from 'jszip';


export default function ApprovalPendingPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    // Not Approve modal state & handlers
    const [showModal, setShowModal] = useState(false);
    const [modalSaleId, setModalSaleId] = useState(null);
    const [modalMessage, setModalMessage] = useState("");
    const [modalFile, setModalFile] = useState(null);
    const [modalReupload, setModalReupload] = useState("no");
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState("");

    const openNotApprove = (id) => {
        setModalSaleId(id);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setModalSaleId(null);
        setModalMessage("");
        setModalFile(null);
        setModalReupload("no");
        setModalError("");
        setModalLoading(false);
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) setModalFile(f);
    };

    const handleSubmitModal = async () => {
        try {
            setModalLoading(true);

            // If a file is provided, upload it first to /api/upload
            let uploadedFiles = [];
            if (modalFile) {
                const upForm = new FormData();
                upForm.append('file', modalFile);
                const upRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
                    method: 'POST',
                    body: upForm,
                    credentials: 'include'
                });
                const upPayload = await upRes.json();
                if (!upRes.ok) throw new Error(upPayload?.message || 'Failed to upload file');
                // uploadRoute returns files: [{ filename, originalName, folder }]
                uploadedFiles = (upPayload.files || []).map(f => f.filename);
            }

            // Send email reply instead of comment
            const payloadRes = await axios.post(`/api/email/reply/${modalSaleId}`, {
                message: modalMessage,
                attachments: uploadedFiles,
                action: 'reject' // This will mark the order as not approved
            });

            toast.success(payloadRes.data?.message || 'Email reply sent and order marked as not approved');
            setShowModal(false);
            window.dispatchEvent(new CustomEvent("sales-updated", { detail: { id: modalSaleId } }));
        } catch (err) {
            const msg = err?.message || (err?.response?.data?.message) || "Failed to submit";
            setModalError(msg);
            toast.error(msg);
        } finally {
            setModalLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        axios
            .get("/api/sales")
            .then((res) => {
                if (!mounted) return;
                const salesData = res.data?.data || [];
                setItems(salesData);
            })
            .catch((err) => setError(err?.message || "Failed to load"))
            .finally(() => setLoading(false));

        return () => (mounted = false);
    }, []);

    const [graphicsMap, setGraphicsMap] = useState({});

    useEffect(() => {
        let mounted = true;
        axios.get('/api/graphic')
            .then((res) => {
                if (!mounted) return;
                const list = res.data?.data || [];
                const map = {};
                for (const g of list) {
                    const saleId = g.sales?._id || g.sales;
                    if (saleId) map[saleId] = g;
                }
                setGraphicsMap(map);
            })
            .catch(() => { });

        const handler = () => {
            axios.get('/api/graphic')
                .then((res) => {
                    const list = res.data?.data || [];
                    const map = {};
                    for (const g of list) {
                        const saleId = g.sales?._id || g.sales;
                        if (saleId) map[saleId] = g;
                    }
                    setGraphicsMap(map);
                })
                .catch(() => { });
        };

        window.addEventListener('sales-updated', handler);
        return () => { mounted = false; window.removeEventListener('sales-updated', handler); };
    }, []);

    // show only sales where CDR was submitted
    const handleApprove = async (id) => {
        try {
            setLoading(true);
            await axios.put(`/api/sales/${id}`, { orderStatus: "approvalDone" });

            // Send approval email to vendor
            try {
                await axios.post(`/api/email/reply/${id}`, {
                    message: "Congratulations! Your order has been approved. We will proceed with the production.",
                    action: 'approve'
                });
                toast.success("Order approved and email sent to vendor");
            } catch (emailErr) {
                console.error('Failed to send approval email:', emailErr);
                toast.success("Order approved (email sending failed)");
            }

            setItems((prev) => prev.filter((s) => s._id !== id));
            // notify other parts of the app
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("sales-updated", { detail: { id } }));
            }
        } catch (err) {
            setError(err?.message || "Failed to approve");
            toast.error(err?.message || "Failed to approve");
        } finally {
            setLoading(false);
        }
    };

    // show only sales where order status is 'mailsent', 'notApproved' or 'reuploadedcdr' (stay in pending until approved)
    const pending = items.filter((s) => s.orderStatus === "mailsent" || s.orderStatus === "approvalpending" || s.orderStatus === "notApproved" || s.orderStatus === "reuploadedcdr");

    // pagination & search
    const filteredPending = pending.filter(s => JSON.stringify(s).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filteredPending.length / itemsPerPage));
    const displayedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // listen for sales updates and update list
    useEffect(() => {
        const handler = async (e) => {
            try {
                const id = e?.detail?.id;
                if (!id) {
                    const res = await axios.get('/api/sales');
                    const salesData = res.data?.data || [];
                    setItems(salesData);
                    return;
                }
                const res = await axios.get(`/api/sales/${id}`);
                if (res.data?.success) {
                    const updated = res.data.data;
                    if (updated.orderStatus === 'mailsent' || updated.orderStatus === 'approvalpending' || updated.orderStatus === 'notApproved' || updated.orderStatus === 'reuploadedcdr') {
                        setItems((prev) => (prev.some(x => x._id === updated._id) ? prev.map(x => x._id === updated._id ? updated : x) : [...prev, updated]));
                    } else {
                        setItems((prev) => prev.filter(x => x._id !== updated._id));
                    }
                } else {
                    setItems((prev) => prev.filter(x => x._id !== id));
                }
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener('sales-updated', handler);
        return () => window.removeEventListener('sales-updated', handler);
    }, []);

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">
                    Approval Pending List
                </h2>

                <div className="flex items-center gap-6">
                    <Search value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} className="px-3 py-1.5 rounded-lg text-sm outline-none ml-5" />
                    <button className="text-white hover:text-gray-200 transition">
                        <Download size={24} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse">
                        <tr>
                            <th className="px-6 py-3 text-center">Design Name</th>
                            <th className="px-6 py-3 text-center">Attached File</th>
                            <th className="px-6 py-3 text-center">Card Type</th>
                            <th className="px-6 py-3 text-center">Quantity</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center">Loading...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} className="text-center text-red-600">{error}</td>
                            </tr>
                        ) : pending.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No approval pending orders
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayedPending.map((s) => (
                                <tr key={s._id} className="border-b hover:bg-gray-50 text-center">
                                    <td className="px-6 py-3 text-center align-middle">
                                        {s.designName}
                                    </td>

                                    <td className="px-6 py-3 text-center align-middle">
                                        {(() => {
                                            const vendorReplies = s.emailCommunications?.filter(email => email.emailType === 'vendor_reply') || [];
                                            const hasReply = vendorReplies.length > 0;
                                            return hasReply ? (
                                                <button
                                                    onClick={async () => {
                                                        const latestReply = vendorReplies[vendorReplies.length - 1];
                                                        if (!latestReply) return;

                                                        const zip = new JSZip();

                                                        // Add attachments only
                                                        if (latestReply.attachments && latestReply.attachments.length > 0) {
                                                            for (const filename of latestReply.attachments) {
                                                                const fileUrl = getImageUrl(filename);
                                                                try {
                                                                    const response = await fetch(fileUrl);
                                                                    const blob = await response.blob();
                                                                    zip.file(filename, blob);
                                                                } catch (error) {
                                                                    console.error(`Failed to fetch attachment: ${filename}`, error);
                                                                }
                                                            }
                                                        }

                                                        if (latestReply.attachments && latestReply.attachments.length > 0) {
                                                            const zipBlob = await zip.generateAsync({ type: 'blob' });
                                                            const url = URL.createObjectURL(zipBlob);
                                                            const a = document.createElement('a');
                                                            a.download = `vendor_attachments.zip`;
                                                            a.href = url;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        } else {
                                                            toast.error('No attachments to download');
                                                        }
                                                    }}
                                                    className="inline-flex justify-center text-blue-600 hover:text-blue-800"
                                                    title="Download Vendor Attachments as ZIP"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            ) : (
                                                <span className="text-gray-500">No Reply</span>
                                            );
                                        })()}
                                    </td>

                                    <td className="px-6 py-3 text-center align-middle">
                                        {s.cardType}
                                    </td>

                                    <td className="px-6 py-3 text-center align-middle">
                                        {s.quantity}
                                    </td>

                                    <td className="px-6 py-3 text-center align-middle text-red-600 font-medium">
                                        Approval Pending
                                    </td>

                                    <td className="px-6 py-3 text-center align-middle">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Are you sure you want to approve?")) {
                                                        handleApprove(s._id);
                                                    }
                                                }}
                                                disabled={loading}
                                                className="button-gradient text-white px-3 py-1 rounded-md text-xs disabled:opacity-50"
                                            >
                                                Approve
                                            </button>

                                            <button
                                                onClick={() => openNotApprove(s._id)}
                                                className="button-gradient-reverse text-white px-3 py-1 rounded-md text-xs"
                                            >
                                                Not Approve
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-40" onClick={closeModal} />
                    <div className="bg-white rounded-xl shadow-xl z-10 w-full max-w-md p-6 relative">
                        <button className="absolute top-3 right-3 text-gray-500" onClick={closeModal}>✕</button>
                        <h3 className="text-lg font-semibold mb-4">Send Email Reply</h3>

                        <label className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea value={modalMessage} onChange={(e) => setModalMessage(e.target.value)} className="w-full border rounded mt-1 p-2 h-24" />

                        <label className="block text-sm font-medium text-gray-700 mt-4">Upload Attachment</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input id="modal-file" type="file" onChange={handleFileChange} className="hidden" />
                            <div className="flex-1 border rounded px-3 py-2 text-sm">{modalFile ? modalFile.name : <span className="text-gray-400">No file selected</span>}</div>
                            <label htmlFor="modal-file" className="cursor-pointer text-gray-500"><Upload size={18} /></label>
                            {modalFile && <button className="ml-2 text-sm text-red-500" onClick={() => setModalFile(null)}>✕</button>}
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-medium">Reupload of CDR</div>
                            <div className="flex gap-4 items-center mt-2">
                                <label className="flex items-center gap-2"><input type="radio" name="reupload" value="yes" checked={modalReupload === 'yes'} onChange={() => setModalReupload('yes')} /> Yes</label>
                                <label className="flex items-center gap-2"><input type="radio" name="reupload" value="no" checked={modalReupload === 'no'} onChange={() => setModalReupload('no')} /> No</label>
                            </div>
                        </div>

                        {modalError && <div className="text-red-600 mt-3">{modalError}</div>}

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={handleSubmitModal}
                                disabled={modalLoading || (!modalMessage.trim() && !modalFile)}  // Disable if loading or both fields are empty
                                className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {modalLoading ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            <div className="flex justify-end gap-2 p-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
            </div>
        </div>
    );
}

/* ---------- Reusable ---------- */

const th = ({ children }) => (
    <th className="px-4 py-2 text-left font-medium">{children}</th>
);

const td = ({ children, className = "" }) => (
    <td className={`px-4 py-2 ${className}`}>{children}</td>
);

/* PageBtn removed — use shared Pagination component */
