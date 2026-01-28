"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axiosConfig";
import { PackageCheck } from "lucide-react";

export default function VendorListPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    const fetchVendors = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.get('/api/vendors');
            // res.data may have { success, count, page, data }
            setVendors(res.data?.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to fetch vendors");
            toast.error(err?.response?.data?.message || "Failed to fetch vendors");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        if (mounted) fetchVendors();
        return () => (mounted = false);
    }, []);

    useEffect(() => {
        const handler = async (e) => {
            try { await fetchVendors(); } catch (err) { /* ignore */ }
        };
        window.addEventListener("vendors-updated", handler);
        return () => window.removeEventListener("vendors-updated", handler);
    }, []);

    // client-side filter and pagination
    const filtered = vendors.filter(v => JSON.stringify(v).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const displayed = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSearchChange = (v) => { setSearchTerm(v); setCurrentPage(1); };

    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">Vendor List</h2>

                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => handleSearchChange(v)} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                    <button onClick={() => router.push("/dashboard/admin/vendorList/addVendor")} className="button-gradient-reverse text-white text-sm px-4 py-1.5 rounded-lg">Add Vendor</button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white">
                        <tr>
                            <th className="px-3 py-3 text-center">Vendor Name</th >
                            <th className="px-3 py-3 text-center">Dealing Company</th >
                            <th className="px-3 py-3 text-center">Email</th >
                            <th className="px-3 py-3 text-center">Mobile No.</th >
                            <th className="px-3 py-3 text-center">Action</th >
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <Td colSpan={5} className="text-center">Loading...</Td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <Td colSpan={5} className="text-center text-red-600">{error}</Td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-16">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <PackageCheck size={48} className="text-indigo-500" />
                                        <span className="text-lg font-medium">
                                            No Vendors Found
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayed.map((v) => (
                                <tr key={v._id} className="border-b hover:bg-gray-50 text-center">
                                    <Td className="text-left">{v.vendorName}</Td>
                                    <Td className="text-left">{v.dealingCompany}</Td>
                                    <Td>{v.email}</Td>
                                    <Td>{v.mobile}</Td>
                                    <Td>
                                        <div className="flex justify-center gap-3">
                                            <button
                                                className="px-2 button-gradient py-1 rounded text-xs"
                                                onClick={() => router.push(`/dashboard/admin/vendorList/${v._id}/pricing`)}
                                            >
                                                View Pricing
                                            </button>
                                            <button
                                                className="px-2 button-gradient-reverse py-1 rounded border text-xs"
                                                onClick={() => router.push(`/dashboard/admin/vendorList/${v._id}/pricing/add`)}
                                            >
                                                Add Pricing
                                            </button>
                                        </div>
                                    </Td>
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

// small helpers to match other list pages
const th = ({ children }) => (
    <th className="px-6 py-3 text-left">{children}</th>
);

const Td = ({ children, className, colSpan }) => (
    <td className={`px-6 py-3 ${className || ""}`} colSpan={colSpan}>{children}</td>
);