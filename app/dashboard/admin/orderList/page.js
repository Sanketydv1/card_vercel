"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Copy, PackageCheck } from 'lucide-react';
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axios from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { getImageUrl } from '@/lib/imageUrl';
import { FROM_ADDRESS_MAP } from '@/lib/companyAddress';

export default function AdminOrderList() {
    const router = useRouter();
    const [sales, setSales] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    // modal state for card preview
    const [showModal, setShowModal] = useState(false);
    const [modalOrder, setModalOrder] = useState(null);
    // confirm change modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState(null);
    // pricing modal state
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingList, setPricingList] = useState([]);
    const [selectedPricingId, setSelectedPricingId] = useState("");
    const [inputPrice, setInputPrice] = useState("");
    const [pricingNote, setPricingNote] = useState("");
    const [notesInput, setNotesInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);  // Add this new state

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [sRes, vRes] = await Promise.all([
                axios.get('/api/sales'),
                axios.get('/api/vendors?limit=100')
            ]);
            if (sRes.data.success) setSales(sRes.data.data || []);
            if (vRes.data.success) setVendors(vRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load sales/vendors');
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

    const handleVendorChange = async (saleId, vendorId) => {
        if (!vendorId) return;

        // Find the sale to check status and vendor
        const sale = sales.find(s => s._id === saleId);

        // Disable vendor change for ordergenerated and approvalDone statuses
        const disabledStatuses = ["ordergenerated", "approvalDone", "cardReady", "cardDispatched", "cardDelivered", "submitted", "recieved"];
        if (disabledStatuses.includes(sale?.orderStatus)) {
            toast.error('Cannot change vendor for this order status');
            return;
        }

        const hasExistingVendor = sale && sale.vendor;

        if (hasExistingVendor) {
            // If vendor already assigned, show confirmation modal
            const vendor = vendors.find(v => v._id === vendorId);
            setConfirmData({ saleId, vendorId, vendor });
            setShowConfirmModal(true);
            document.body.style.overflow = 'hidden';
        } else {
            // If first time selecting vendor, go directly to pricing
            await openPricingModalForVendor(saleId, vendorId);
        }
    };

    const openPricingModalForVendor = async (saleId, vendorId) => {
        try {
            setSelectedPricingId("");
            setInputPrice("");
            setPricingNote("");
            setNotesInput("");
            // fetch pricing for vendor
            const res = await axios.get(`/api/vendor/${vendorId}/pricing`);
            if (res.data.success) {
                setPricingList(res.data.data || []);
            } else {
                setPricingList([]);
            }
            // open modal and store order id in modalOrder to use on confirm
            setModalOrder({ _id: saleId, vendor: vendorId });
            setShowPricingModal(true);
            document.body.style.overflow = 'hidden';
        } catch (err) {
            toast.error('Failed to load vendor pricing');
        }
    };

    const confirmVendorChange = async () => {
        if (!confirmData) return;
        const { saleId, vendorId } = confirmData;

        try {
            setSelectedPricingId("");
            setInputPrice("");
            setPricingNote("");
            setNotesInput("");
            // fetch pricing for vendor
            const res = await axios.get(`/api/vendor/${vendorId}/pricing`);
            if (res.data.success) {
                setPricingList(res.data.data || []);
            } else {
                setPricingList([]);
            }
            // open modal and store order id in modalOrder to use on confirm
            setModalOrder({ _id: saleId, vendor: vendorId });
            setShowPricingModal(true);
            setShowConfirmModal(false);
            setConfirmData(null);
        } catch (err) {
            toast.error('Failed to load vendor pricing');
        }
    };

    const closeConfirmModal = () => {
        setShowConfirmModal(false);
        setConfirmData(null);
        document.body.style.overflow = '';
    };

    const closePricingModal = () => {
        setShowPricingModal(false);
        setPricingList([]);
        setSelectedPricingId("");
        setInputPrice("");
        setPricingNote("");
        setNotesInput("");
        setModalOrder(null);
        document.body.style.overflow = '';
    };

    const handlePricingSelect = (pricing) => {
        // single select only
        if (selectedPricingId === pricing._id) {
            // deselect
            setSelectedPricingId("");
            setInputPrice("");
            setPricingNote("");
            setNotesInput("");
        } else {
            setSelectedPricingId(pricing._id);
            // if pricing has inputPrice field use it otherwise use price
            setInputPrice((pricing.inputPrice ?? pricing.price ?? "").toString());
            setPricingNote(pricing.notes || "");
        }
    };

    const confirmPricing = async () => {
        if (!modalOrder || isSubmitting) return;  // Early return if already submitting

        // Validation: Either pricing must be selected OR input price must be entered
        if (!selectedPricingId && !inputPrice.trim()) {
            toast.error('Please select a pricing option or enter an input price');
            return;
        }

        const saleId = modalOrder._id;
        const vendorId = modalOrder.vendor;
        setIsSubmitting(true);  // Disable further clicks
        try {
            // Get vendor details to check poSubmissionRequired
            const vendorData = vendors.find(v => v._id === vendorId);
            let newStatus = "mailsent"; // default

            if (vendorData && vendorData.poSubmissionRequired) {
                newStatus = "poPending";
            }

            // update sale with vendor, vendorPricing, inputPrice, notes, and new status
            await axios.put(`/api/sales/${saleId}`, {
                vendor: vendorId,
                vendorPricing: selectedPricingId || null,
                inputPrice: inputPrice ? Number(inputPrice) : null,
                notes: notesInput.trim() || undefined,
                orderStatus: newStatus
            });
            toast.success('Vendor selected successfully');
            closePricingModal();
            fetchData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update sale');
        } finally {
            setIsSubmitting(false);  // Re-enable the button
        }
    };

    const downloadTableData = () => {
        if (displayedSales.length === 0) {
            toast.error('No data to download');
            return;
        }

        // Prepare CSV header
        const headers = ['Design Name', 'Card Type', 'Data Type', 'Quantity', 'Price', 'Status'];

        // Prepare CSV rows
        const rows = displayedSales.map(s => {
            const price = s.inputPrice != null
                ? Number(s.inputPrice).toFixed(2)
                : (s.vendorPricing && typeof s.vendorPricing === 'object' && s.vendorPricing.price != null
                    ? Number(s.vendorPricing.price).toFixed(2)
                    : '-');

            return [
                (s.designName || '').toString().replace(/"/g, '""'),
                (s.cardType || '-').toString().replace(/"/g, '""'),
                (s.dataType || '').toString().replace(/"/g, '""'),
                s.quantity || '',
                price,
                (s.uiStatus || s.orderStatus || 'Order Generated').toString().replace(/"/g, '""')
            ];
        });

        // Create CSV content with proper formatting
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                const str = cell.toString();
                // Quote cells that contain comma, newline, or quotes
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                    return `"${str}"`;
                }
                return str;
            }).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `order_list_page_${currentPage}_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Table data downloaded successfully');
    };

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">Vendor Selected List</h2>
                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                    <button onClick={() => router.push('/dashboard/admin/adminOrders/addOrder')} className="button-gradient-reverse text-white text-sm px-4 py-1.5 rounded-lg">Add Card Order</button>
                    <button onClick={downloadTableData} className="text-white hover:text-gray-200 transition" title="Download current page data">
                        <Download size={24} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white px-3 py-4 text-center">
                        <tr>
                            <th className="px-3 py-3 text-center">Design Name</th>
                            <th className="px-3 py-3 text-center">Data type</th>
                            <th className="px-3 py-3 text-center">Card Type</th>
                            <th className="px-3 py-3 text-center">Card Photo</th>
                            <th className="px-3 py-3 text-center">Full Name</th>
                            <th className="px-3 py-3 text-center">Quantity</th>
                            <th className="px-3 py-3 text-center">Unit Rate</th>
                            <th className="px-3 py-3 text-center">Status</th>
                            <th className="px-3 py-3 text-center">Select Vendor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="text-center">Loading...</td></tr>
                        ) : filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No orders Found
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : displayedSales.map((s) => (
                            <tr key={s._id} className="border-b hover:bg-gray-50 text-center">
                                <td className="px-6 py-3">{s.designName}</td>
                                <td className="capitalize">{s.dataType}</td>
                                <td className="capitalize">{s.cardType || '-'}</td>
                                <td>
                                    <button onClick={() => openCardPreview(s)} aria-label="Preview card" className="mx-auto text-indigo-600 hover:scale-110 transition-transform border rounded-md p-[2px]">
                                        <Eye size={18} className="mx-auto cursor-pointer" />
                                    </button>
                                </td>
                                <td>{s.fullName || (s.createdBy ? `${s.createdBy.firstName} ${s.createdBy.lastName}` : (s.mobile ? `Customer (${s.mobile})` : 'System'))}</td>
                                <td>{s.quantity}</td>
                                <td>
                                    {s.inputPrice != null
                                        ? Number(s.inputPrice).toFixed(2)
                                        : (s.vendorPricing && typeof s.vendorPricing === 'object' && s.vendorPricing.price != null
                                            ? Number(s.vendorPricing.price).toFixed(2)
                                            : '-')}
                                </td>
                                <td>
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                        {s.uiStatus || s.orderStatus || 'Order Generated'}
                                    </span>
                                </td>
                                <td>
                                    <select
                                        value={s.vendor ? s.vendor._id || s.vendor : ""}
                                        onChange={(e) => handleVendorChange(s._id, e.target.value)}
                                        disabled={["ordergenerated", "approvalDone", "cardReady", "cardDispatched", "cardDelivered", "submitted", "recieved"].includes(s.orderStatus)}
                                        className="px-1 mr-1 py-1 border rounded bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => <option key={v._id} value={v._id}>{v.vendorName}</option>)}
                                    </select>
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

            {/* Confirm Vendor Change Modal */}
            {showConfirmModal && confirmData ? (
                <div onClick={closeConfirmModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[420px] max-w-full rounded-lg shadow-xl p-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-center text-xl font-bold mb-2">Confirm Change</h3>
                        <p className="text-center text-gray-600 mb-6">Do you really want to change the Vendor</p>

                        <div className="flex justify-center gap-4">
                            <button onClick={closeConfirmModal} className="px-6 py-2 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={confirmVendorChange} className="px-6 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Pricing Modal (open when selecting vendor) */}
            {showPricingModal ? (
                <div onClick={closePricingModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white w-[520px] max-w-full rounded-lg shadow-xl max-h-[90vh] overflow-auto p-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Select Pricing</h3>
                            <button onClick={closePricingModal} className="text-gray-600">✕</button>
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-medium mb-2">Pricing</div>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-auto">
                                {pricingList.length === 0 ? (
                                    <div className="text-center text-sm text-gray-600">No pricing available for this vendor</div>
                                ) : pricingList.map((p) => (
                                    <label key={p._id} className="flex items-center justify-between border rounded p-2">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={selectedPricingId === p._id} onChange={() => handlePricingSelect(p)} />
                                            <div className="text-sm">
                                                <div className="font-medium">{p.cardType} - {p.dataType} </div>
                                                <div className="text-xs text-gray-600">Qty: {p.quantityFrom} - {p.quantityTo} • Price: {Number(p.price).toFixed(2)}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm">{p.notes || ""}</div>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm text-gray-700">Input Price</label>
                                <input value={inputPrice} onChange={(e) => setInputPrice(e.target.value)} className="w-full mt-1 border rounded px-3 py-2" placeholder="Enter price" />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm text-gray-700">Notes (Optional)</label>
                                <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} className="w-full mt-1 border rounded px-3 py-2 resize-none" placeholder="Add notes for this order" rows={3} />
                            </div>

                            {pricingNote ? (
                                <div className="mt-3 text-sm font-medium">Note : <span className="font-normal">{pricingNote}</span></div>
                            ) : null}

                            <div className="mt-6 flex justify-end gap-2">
                                <button onClick={closePricingModal} className="px-4 py-2 rounded border">Cancel</button>
                                <button
                                    onClick={confirmPricing}
                                    disabled={isSubmitting || (!selectedPricingId && !inputPrice.trim())}
                                    className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

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