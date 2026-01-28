"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Copy, PackageCheck } from 'lucide-react';
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axios from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { getImageUrl } from '@/lib/imageUrl';

export default function AdminOrderList() {
    const router = useRouter();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    // modal state for card preview
    const [showModal, setShowModal] = useState(false);
    const [modalOrder, setModalOrder] = useState(null);

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);

            const res = await axios.get('/api/sales');

            if (res.data?.success) {
                const deliveredSales = (res.data.data || []).filter(item =>
                    (item.orderStatus === "cardDelivered") ||
                    (item.status === "cardDelivered") ||
                    (item.uiStatus === "Card Delivered")
                );
                setSales(deliveredSales);
            }
        } catch (err) {
            toast.error('Failed to load sales');
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchData();

        const onUpdate = () => fetchData();
        window.addEventListener('sales-updated', onUpdate);
        return () => window.removeEventListener('sales-updated', onUpdate);
    }, []);

    const openCardPreview = (order) => {
        setModalOrder(order);
        setShowModal(true);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setShowModal(false);
        setModalOrder(null);
        document.body.style.overflow = '';
    };

    // client-side search & pagination (keep server data as-is)
    const filteredSales = sales.filter(s => JSON.stringify(s).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
    const displayedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">Card Delivered List</h2>
                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                    <button onClick={() => router.push('/dashboard/admin/orderList/addOrder')} className="button-gradient-reverse text-white text-sm px-4 py-1.5 rounded-lg">Add Card Order</button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white px-3 py-4 text-center">
                        <tr>
                            <th className="px-3 py-3 text-center">Design Name</th>
                            <th className="px-3 py-3 text-center">Data type</th>
                            <th className="px-3 py-3 text-center">Card Photo</th>
                            <th className="px-3 py-3 text-center">Full Name</th>
                            <th className="px-3 py-3 text-center">Quantity</th>
                            <th className="px-3 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center">Loading...</td></tr>
                        ) : filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No Orders Found
                                        </span>
                                    </div>
                                </td>
                            </tr>

                        ) : displayedSales.map((s) => (
                            <tr key={s._id} className="border-b hover:bg-gray-50 text-center">
                                <td className="px-6 py-3">{s.designName}</td>
                                <td className="capitalize">{s.dataType}</td>
                                <td>
                                    <button onClick={() => openCardPreview(s)} aria-label="Preview card" className="mx-auto text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]">
                                        <Eye size={18} className="mx-auto cursor-pointer" />
                                    </button>
                                </td>
                                <td>{s.fullName || (s.createdBy ? `${s.createdBy.firstName} ${s.createdBy.lastName}` : (s.mobile ? `Customer (${s.mobile})` : 'System'))}</td>
                                <td>{s.quantity}</td>
                                <td>
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                                        {s.uiStatus || s.orderStatus || 'Order Generated'}
                                    </span>
                                </td>
                            </tr>
                        ))}
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

                                        {/* To */}
                                        <div className="flex items-start justify-between">
                                            <div className="text-sm text-gray-600">
                                                To : <span className="font-medium">{modalOrder.to}</span>
                                            </div>
                                        </div>

                                        {/* From */}
                                        <div className="flex items-start justify-between">
                                            <div className="text-sm text-gray-600">
                                                From : <span className="font-medium">{modalOrder.from}</span>
                                            </div>
                                        </div>

                                        {/* Copy both */}
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                TO :
                                                <span className="font-medium">{modalOrder.to?.toUpperCase()}</span>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const text = `
${modalOrder.designName?.toUpperCase()} ADDRESS

COURIER: ${modalOrder.modeOfCourier?.toUpperCase()}

TO:
${modalOrder.to?.toUpperCase()}

FROM:
${modalOrder.from?.toUpperCase()}
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


                                    </div>

                                </div>
                            </div>

                            <div className="mt-6 text-center">
                                {/* <button onClick={closeModal} className="px-6 py-2 rounded bg-blue-600 text-white">Close</button> */}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// small helpers to match other list pages
const th = ({ children }) => (
    <th className="px-6 py-3 text-left">{children}</th>
);

const td = ({ children, className, colSpan }) => (
    <td className={`px-6 py-3 ${className || ""}`} colSpan={colSpan}>{children}</td>
);