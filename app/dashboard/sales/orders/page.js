"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, RefreshCcw, Copy, PackageCheck } from "lucide-react";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axios from "../../../../lib/axiosConfig";
import toast from "react-hot-toast";
import { getImageUrl } from '@/lib/imageUrl';
import { FROM_ADDRESS_MAP } from '@/lib/companyAddress';

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
    const [showRepeatModal, setShowRepeatModal] = useState(false);
    const [repeatOrderId, setRepeatOrderId] = useState(null);

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showModal]);

    const openCardPreview = (order) => {
        setModalOrder(order);
        setModalMode('card');
        setShowModal(true);
    };

    const openFullPreview = (order) => {
        setModalOrder(order);
        setModalMode('full');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setModalOrder(null);
        setModalMode('card');
    };

    const handleRepeat = (id) => {
        setRepeatOrderId(id);
        setShowRepeatModal(true);
    };

    const confirmRepeat = async () => {
        if (!repeatOrderId) return;
        // Navigate to add page with repeat param for preview/edit
        router.push(`/dashboard/sales/orders/add?repeat=${repeatOrderId}`);
        setShowRepeatModal(false);
        setRepeatOrderId(null);
    };

    useEffect(() => {
        let mounted = true;
        axios
            .get("/api/sales")
            .then((res) => {
                if (!mounted) return;
                setLoading(false);
                setOrders(res.data?.data || []);
            })
            .catch((err) => {
                if (mounted) {
                    setError(err?.message || "Failed to load");
                    setLoading(false);
                }
            });

        return () => (mounted = false);
    }, []);

    // listen for updates to sales (e.g., approval actions) and update orders list
    useEffect(() => {
        const handler = async (e) => {
            try {
                const id = e?.detail?.id;
                if (!id) {
                    const res = await axios.get("/api/sales");
                    setOrders(res.data?.data || []);
                    return;
                }
                const res = await axios.get(`/api/sales/${id}`);
                if (res.data?.success) {
                    const updated = res.data.data;
                    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
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

                    <button onClick={() => router.push("/dashboard/sales/orders/add")} className="button-gradient-reverse text-white text-sm px-4 py-1.5 rounded-lg">Add Card Order</button>
                </div>
            </div>


            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white">
                        <tr>
                            <th className="px-6 py-3 text-center">Design Name</th>
                            <th className="px-6 py-3 text-center">Card Photo</th>
                            <th className="px-6 py-3 text-center">Card Type</th>
                            <th className="px-6 py-3 text-center">Quantity</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Order Repeat</th>
                            <th className="px-6 py-3 text-center">Action</th>
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
                                            No orders found.
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
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>{o.designName}</span>
                                                {!isRoot ? (copyIndex > 0 ? <span className="text-sm text-gray-500">({copyIndex})</span> : <span className="text-sm text-gray-400">(copy)</span>) : null}
                                            </div>
                                        </td>
                                        <td>
                                            <button onClick={() => openCardPreview(o)} aria-label="Preview card" className="mx-auto text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]">
                                                <Eye size={18} className="mx-auto cursor-pointer " />
                                            </button>
                                        </td>
                                        <td>{o.cardType}</td>
                                        <td>{o.quantity}</td>
                                        <td>
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                {o.uiStatus || o.orderStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <button disabled={loading} onClick={() => handleRepeat(o._id)} className="mx-auto text-orange-500">
                                                <RefreshCcw size={19} className="mx-auto text-orange-500 cursor-pointer" />
                                            </button>
                                        </td>
                                        <td>
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openFullPreview(o)} aria-label="View details" className="hover:scale-110 transition-transform border rounded-md p-[2px]">
                                                    <Eye size={18} className="cursor-pointer" />
                                                </button>
                                                <button
                                                    disabled={o.orderStatus === "approvalDone"}
                                                    onClick={() => router.push(`/dashboard/sales/orders/edit/${o._id}`)}
                                                    aria-label="Edit Order"
                                                    className={`border rounded-md p-[2px]
                                                            ${o.orderStatus === "approvalDone"
                                                            ? "text-gray-400 cursor-not-allowed opacity-50"
                                                            : "text-indigo-600 hover:scale-110"}
                                                        `}
                                                >
                                                    <Pencil size={18} />
                                                </button>

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
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[62 0px] max-w-full rounded-lg shadow-xl max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center p-4">
                            <h3 className="text-lg font-medium">Card Preview</h3>
                            <button onClick={closeModal} className="text-gray-600">✕</button>
                        </div>

                        <div className="px-6">
                            <div className="mb-4 flex flex-col items-center rounded">
                                <img src={modalOrder.cardPhoto ? (typeof modalOrder.cardPhoto === 'string' && !modalOrder.cardPhoto.startsWith('data:') ? getImageUrl(modalOrder.cardPhoto) : modalOrder.cardPhoto) : ''} alt="card preview" className="w-full h-48 object-fit rounded-lg" />
                                <p className="text-center mt-4 text-lg font-semibold">Design Name : <strong>{modalOrder.designName}</strong></p>
                            </div>

                            {modalMode === 'full' && (
                                <div className="border rounded p-4 bg-gray-50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-600">Data Type : <span className="font-medium">{modalOrder.dataType === 'variable' ? 'Variable' : 'Fixed'}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Card Type : <span className="font-medium capitalize">{modalOrder.cardType}{modalOrder.cardType === 'Others' && modalOrder.customCardType ? ` (${modalOrder.customCardType})` : modalOrder.cardType && modalOrder.cardType.toLowerCase() === 'others' && modalOrder.customCardType ? ` (${modalOrder.customCardType})` : ''}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Finishing : <span className="font-medium capitalize">{modalOrder.finishing}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Pin Code : <span className="font-medium">{modalOrder.pinCode}</span></div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-gray-600">Mobile No. : <span className="font-medium">{modalOrder.mobile}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Quantity : <span className="font-medium">{modalOrder.quantity}</span></div>
                                            <div className="text-sm text-gray-600 mt-2">Mode of Courier : <span className="font-medium capitalize">{modalOrder.modeOfCourier}</span></div>
                                        </div>

                                        <div className="col-span-2 mt-0 space-y-1">

                                            {/* To + Copy */}
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                                    TO :
                                                    <span className="font-medium">{modalOrder.to?.toUpperCase()}</span>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const fromAddress =
                                                                FROM_ADDRESS_MAP[modalOrder.from] ||
                                                                modalOrder.from?.toUpperCase();

                                                            const text = `
${modalOrder.designName?.toUpperCase()} ADDRESS

COURIER: ${modalOrder.modeOfCourier?.toUpperCase()}

TO:
${modalOrder.mobile}
${modalOrder.to?.toUpperCase()}
${modalOrder.pinCode}

FROM:
${fromAddress}
    `.trim();

                                                            navigator.clipboard.writeText(text);
                                                            toast.success("COPIED");
                                                        }}
                                                        className="text-gray-500 hover:text-gray-700 ml-8"
                                                        aria-label="COPY ADDRESSES"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>


                                            {/* From */}
                                            <div className="flex items-start justify-between">
                                                <div className="text-sm text-gray-600">
                                                    From : <span className="font-medium">{modalOrder.from}</span>
                                                </div>
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

            {/* Repeat Confirmation Modal */}
            {showRepeatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-medium mb-4">Confirm Repeat Order</h3>
                        <p className="mb-4">Are you sure you want to repeat this order? Variable files will not be copied.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRepeatModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                            <button onClick={confirmRepeat} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">OK</button>
                        </div>
                    </div>
                </div>
            )}

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
