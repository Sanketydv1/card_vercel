"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { Trash2, Pencil } from 'lucide-react';
import Pagination from '../../../../components/pagination';
// import Search from '../../../../components/search';


export default function VendorPricingPage({ params }) {
    const { id } = React.use(params);
    const router = useRouter();

    const [vendor, setVendor] = useState(null);
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ cardType: "pvc", dataType: "fixed", quantityFrom: "", quantityTo: "", price: "", notes: "" });

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    // Reset page when search or data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil((pricing || []).length / itemsPerPage));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [pricing, currentPage]);

    const loadVendor = async () => {
        try {
            const res = await axiosInstance.get(`/api/vendor/${id}`);
            setVendor(res.data?.data || null);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load vendor");
        }
    };

    const loadPricing = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/api/vendor/${id}/pricing`);
            setPricing(res.data?.data || []);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load pricing");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadVendor(); loadPricing(); }, [id]);

    const startEdit = (p) => {
        setEditingId(p._id);
        setEditForm({ cardType: p.cardType, dataType: p.dataType, quantityFrom: p.quantityFrom, quantityTo: p.quantityTo, price: p.price, notes: p.notes || "" });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(s => ({ ...s, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            if (Number(editForm.quantityFrom) > Number(editForm.quantityTo)) return toast.error("Quantity From cannot be greater than Quantity To");
            await axiosInstance.put(`/api/pricing/${editingId}`, editForm);
            toast.success("Pricing updated");
            setEditingId(null);
            loadPricing();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Update failed");
        }
    };

    const handleDelete = async (pricingId) => {
        if (!confirm('Are you sure you want to delete this pricing?')) return;
        try {
            await axiosInstance.delete(`/api/pricing/${pricingId}`);
            toast.success('Pricing deleted');
            loadPricing();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        }
    };


    // derive filtered/displayed for pagination & search
    const filtered = pricing.filter((v) => JSON.stringify(v).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const displayed = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-6xl mx-auto rounded-lg py-6 shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-white">
                    <h2 className="text-xl font-semibold">Vendor Pricing List</h2>
                </div>

                <div>
                    <button onClick={() => router.push('/dashboard/admin/vendorList')} className="px-3 py-1 text-white border rounded">Back</button>
                    <button onClick={() => router.push(`/dashboard/admin/vendorList/${id}/pricing/add`)} className="px-3 button-gradient-reverse py-1 ml-2 bg-indigo-600 text-white rounded">Add Pricing</button>
                </div>
            </div>

            {vendor && (
                <div className="mb-4 text-sm text-white">Vendor: <strong>{vendor.vendorName}</strong> — {vendor.dealingCompany}</div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white">
                        <tr>
                            <th className="px-6 py-3 text-center">Card Type</th>
                            <th className="px-6 py-3 text-center">Data Type</th>
                            <th className="px-6 py-3 text-center">Quantity From</th>
                            <th className="px-6 py-3 text-center">Quantity To</th>
                            <th className="px-6 py-3 text-center">Price</th>
                            <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loading ? (
                            <tr><td className="px-6 py-3 text-center" colSpan={6}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td className="px-6 py-3 text-center" colSpan={6}>No pricing found</td></tr>
                        ) : (
                            displayed.map(p => (
                                <tr key={p._id} className="border-b hover:bg-gray-50 text-center">
                                    {editingId === p._id ? (
                                        <>
                                            <td className="px-6 py-3 text-left">
                                                <select name="cardType" value={editForm.cardType} onChange={handleEditChange} className="mt-1 block w-full border rounded p-2">
                                                    <option value="pvc">PVC</option>
                                                    <option value="maifair1k">Maifair 1K</option>
                                                    <option value="proximity">Proximity</option>
                                                    <option value="uhf">UHF</option>
                                                    <option value="nfc213">NFC213</option>
                                                    <option value="nfc216">NFC216</option>
                                                    <option value="maifair4k">Maifair 4K</option>
                                                    <option value="others">Others</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-3 text-left">
                                                <select name="dataType" value={editForm.dataType} onChange={handleEditChange} className="mt-1 block w-full border rounded p-2">
                                                    <option value="fixed">Fixed</option>
                                                    <option value="variable">Variable</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-3"><input name="quantityFrom" value={editForm.quantityFrom} onChange={handleEditChange} className="mt-1 block w-full border rounded p-2" /></td>
                                            <td className="px-6 py-3"><input name="quantityTo" value={editForm.quantityTo} onChange={handleEditChange} className="mt-1 block w-full border rounded p-2" /></td>
                                            <td className="px-6 py-3"><input name="price" value={editForm.price} onChange={handleEditChange} className="mt-1 block w-full border rounded p-2" /></td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded border">Cancel</button>
                                                    <button onClick={handleUpdate} className="px-3 py-1 rounded bg-indigo-600 text-white">Save</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-3 ">{p.cardType}</td>
                                            <td className="px-6 py-3 ">{p.dataType}</td>
                                            <td className="px-6 py-3">{p.quantityFrom}</td>
                                            <td className="px-6 py-3">{p.quantityTo}</td>
                                            <td className="px-6 py-3">{p.price}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:scale-110 transition-transform border rounded-md p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button onClick={() => startEdit(p)} className="text-indigo-600 hover:scale-110 transition-transform border rounded-md p-1">
                                                        <Pencil size={16} />
                                                    </button>

                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Pagination */}
            <div className="flex justify-end gap-2 p-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
            </div>
        </div>
    );
}