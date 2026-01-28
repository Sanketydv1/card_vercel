"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, CloudUpload, Copy, PackageCheck } from "lucide-react";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axios from "../../../../lib/axiosConfig";
import toast from "react-hot-toast";
import { getImageUrl } from '@/lib/imageUrl';

export default function OrderListPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    // modal state for card preview
    const [showModal, setShowModal] = useState(false);
    const [modalOrder, setModalOrder] = useState(null);
    const [modalMode, setModalMode] = useState('card'); // 'card' | 'full'

    const openCardPreview = (order) => {
        setModalOrder(order);
        setModalMode('card');
        setShowModal(true);
        document.body.style.overflow = 'hidden';
    };

    const openFullPreview = (order) => {
        setModalOrder(order);
        setModalMode('full');
        setShowModal(true);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setShowModal(false);
        setModalOrder(null);
        setModalMode('card');
        document.body.style.overflow = '';
    };


    // Upload PO and move to poSubmitted
    const handleUploadPO = async (id) => {
        try {
            if (!window.confirm("Upload PO for this order?")) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                if (!file.name.toLowerCase().endsWith('.pdf')) {
                    toast.error('Only PDF files are allowed');
                    return;
                }
                setLoading(true);
                try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const upl = await axios.post('/api/upload', fd);
                    if (upl.data?.success && upl.data.files && upl.data.files[0]) {
                        const filename = upl.data.files[0].filename;
                        const res = await axios.put(`/api/sales/${id}`, { uploadPO: filename, orderStatus: 'mailsent' });
                        if (res.data?.success) {
                            setOrders(prev => prev.filter(o => o._id !== id));
                            toast.success('PO uploaded successfully');
                            if (typeof window !== 'undefined') window.dispatchEvent(new Event('sales-updated'));
                        } else {
                            toast.error(res.data?.message || 'Failed to attach PO');
                        }
                    } else {
                        toast.error('Upload failed');
                    }
                } catch (err) {
                    toast.error(err?.message || 'Upload failed');
                } finally {
                    setLoading(false);
                }
            };
            input.click();
        } catch (err) {
            setLoading(false);
            toast.error(err?.message || 'Failed');
        }
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        axios
            .get("/api/sales?status=poPending")
            .then((res) => {
                if (!mounted) return;
                setOrders(res.data?.data || []);
            })
            .catch((err) => setError(err?.message || "Failed to load"))
            .finally(() => setLoading(false));

        return () => (mounted = false);
    }, []);

    // listen for updates to sales (e.g., approval actions) and update orders list
    useEffect(() => {
        const handler = async (e) => {
            try {
                const id = e?.detail?.id;
                if (!id) {
                    const res = await axios.get("/api/sales?status=poPending");
                    setOrders(res.data?.data || []);
                    return;
                }
                const res = await axios.get(`/api/sales/${id}`);
                if (res.data?.success) {
                    const updated = res.data.data;
                    if (updated.orderStatus === 'poPending') {
                        setOrders(prev => {
                            const exists = prev.find(p => p._id === updated._id);
                            if (exists) return prev.map(o => o._id === updated._id ? updated : o);
                            return [...prev, updated];
                        });
                    } else {
                        setOrders(prev => prev.filter(o => o._id !== updated._id));
                    }
                } else {
                    setOrders((prev) => prev.filter((o) => o._id !== id));
                }
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener("sales-updated", handler);
        return () => window.removeEventListener("sales-updated", handler);
    }, []);

    // Pagination & search (client-side) — include repeated orders as separate rows
    const filteredOrders = orders.filter(o => JSON.stringify(o).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
    const displayedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">Card Order List</h2>

                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                </div>
            </div>


            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white">
                        <tr>
                            <th className="px-2 py-3 text-center">Design Name</th>
                            <th className="px-2 py-3 text-center">Card Type</th>
                            <th className="px-2 py-3 text-center">Finishing</th>
                            <th className="px-2 py-3 text-center">Quantity</th>
                            <th className="px-2 py-3 text-center">Vendor Name</th>
                            <th className="px-2 py-3 text-center">Card Photo</th>
                            <th className="px-2 py-3 text-center">Unit Rate</th>
                            <th className="px-2 py-3 text-center">Upload PO</th>
                            <th className="px-2 py-3 text-center">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center">Loading...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={7} className="text-center text-red-600">{error}</td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No pending POs found.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayedOrders.map((o) => {
                                const isRoot = !o.originalSale;
                                const rootId = isRoot ? o._id : o.originalSale;
                                const copies = orders.filter(x => x.originalSale && x.originalSale.toString() === rootId.toString());
                                let copyIndex = 0;
                                if (!isRoot) {
                                    const copiesSorted = [...copies].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                                    copyIndex = copiesSorted.findIndex(x => x._id === o._id) + 1;
                                }

                                return (
                                    <tr key={o._id} className="border-b hover:bg-gray-50 text-center">
                                        {/* Design Name */}
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>{o.designName}</span>
                                                {!isRoot ? (copyIndex > 0 ? <span className="text-sm text-gray-500">({copyIndex})</span> : <span className="text-sm text-gray-400">(copy)</span>) : null}
                                            </div>
                                        </td>

                                        {/* Card Type */}
                                        <td className="px-6 py-3">{o.cardType}</td>

                                        {/* Finishing */}
                                        <td className="px-6 py-3">{o.finishing}</td>

                                        {/* Quantity */}
                                        <td className="px-6 py-3">{o.quantity}</td>

                                        {/* Vendor Name */}
                                        <td className="px-6 py-3">{o.vendorName || '-'}</td>

                                        {/* Card Photo (preview) */}
                                        <td className="px-6 py-3">
                                            <button onClick={() => openCardPreview(o)} aria-label="Preview card" className="mx-auto text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]">
                                                <Eye size={18} className="mx-auto cursor-pointer " />
                                            </button>
                                        </td>

                                        {/* Unit Rate (inputPrice) */}
                                        <td className="px-6 py-3">{o.inputPrice ?? '-'}</td>

                                        {/* Upload PO */}
                                        <td className="px-6 py-3">
                                            <button disabled={loading} onClick={() => handleUploadPO(o._id)} className="px-2 py-1 text-white text-sm">
                                                <CloudUpload size={26} className="text-gray-400" />
                                            </button>
                                        </td>

                                        {/* Status + small actions */}
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{o.uiStatus || o.orderStatus}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-end gap-2 p-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
            </div>

            {/* Card Preview Modal */}
            {showModal && modalOrder ? (
                <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[580px] max-w-full rounded-lg shadow-xl max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center p-4">
                            <h3 className="text-lg font-medium">Card Preview</h3>
                            <button onClick={closeModal} className="text-gray-600">✕</button>
                        </div>

                        <div className="px-6">
                            <div className="mb-4 flex flex-col items-center rounded">
                                <img src={modalOrder.cardPhoto ? (typeof modalOrder.cardPhoto === 'string' && !modalOrder.cardPhoto.startsWith('data:') ? getImageUrl(modalOrder.cardPhoto) : modalOrder.cardPhoto) : ''} alt="card preview" className="w-full h-44 object-fit rounded-lg" />
                                <p className="text-center mt-4 text-lg font-semibold">Design Name : <strong>{modalOrder.designName}</strong></p>
                            </div>

                            {modalMode === 'full' && (
                                <div className="border rounded p-4 bg-gray-50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-600">Data Type : <span className="font-medium">{modalOrder.dataType === 'variable' ? 'Variable' : 'Fixed'}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Card Type : <span className="font-medium capitalize">{modalOrder.cardType}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Finishing : <span className="font-medium capitalize">{modalOrder.finishing}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Pin Code : <span className="font-medium">{modalOrder.pinCode}</span></div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-gray-600">Mobile No. : <span className="font-medium">{modalOrder.mobile}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Quantity : <span className="font-medium">{modalOrder.quantity}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Mode of Courier : <span className="font-medium capitalize">{modalOrder.modeOfCourier}</span></div>
                                        </div>

                                        <div className="col-span-2 mt-0 space-y-1">

                                            {/* From */}
                                            <div className="flex items-start justify-between">
                                                <div className="text-sm text-gray-600">
                                                    From : <span className="font-medium">{modalOrder.from}</span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(modalOrder.from || "");
                                                        toast.success("Copied");
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700"
                                                    aria-label="Copy From"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>

                                            {/* To */}
                                            <div className="flex items-start justify-between">
                                                <div className="text-sm text-gray-600">
                                                    To : <span className="font-medium">{modalOrder.to}</span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(modalOrder.to || "");
                                                        toast.success("Copied");
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700"
                                                    aria-label="Copy To"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>

                                        </div>

                                    </div>
                                </div>
                            )}

                            <div className="mt-6 text-center">
                                {/* <button onClick={closeModal} className="px-6 py-2 rounded bg-blue-600 text-white">Close</button> */}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

        </div >
    );
}


/* ---------- Reusable UI ---------- */

const th = ({ children }) => (
    <th className="px-4 py-2 text-left font-medium">{children}</th>
);

const td = ({ children, className = "" }) => (
    <td className={`px-4 py-2 ${className}`}>{children}</td>
);

/* PageBtn removed — use shared Pagination component */
