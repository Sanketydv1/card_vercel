"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Search from '../../components/search';
import Pagination from '../../components/pagination';
import axiosInstance from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { Trash2, Pencil, PackageCheck } from 'lucide-react';

export default function UserListPage() {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // pagination & search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState("");

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.get("/api/users");
            setUsers(res.data?.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to fetch users");
            toast.error(err?.response?.data?.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        if (mounted) fetchUsers();
        return () => (mounted = false);
    }, []);

    // Refresh when other parts of app notify about changes
    useEffect(() => {
        const handler = async (e) => {
            try {
                await fetchUsers();
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener("users-updated", handler);
        return () => window.removeEventListener("users-updated", handler);
    }, []);

    // client-side filter and pagination
    const filtered = users.filter(u => JSON.stringify(u).toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const displayed = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSearchChange = (v) => {
        setSearchTerm(v);
        setCurrentPage(1);
    };

    // edit/delete actions
    const [currentUserId, setCurrentUserId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchCurrentUser = async () => {
        try {
            const res = await axiosInstance.get('/api/auth/me');
            setCurrentUserId(res.data?.data?._id);
        } catch (err) {
            // ignore
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);


    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        setActionLoading(true);
        try {
            await axiosInstance.delete(`/api/user/${id}`);
            toast.success('User deleted');
            window.dispatchEvent(new CustomEvent('users-updated'));
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || 'Delete failed');
        } finally {
            setActionLoading(false);
        }
    };



    return (
        <div className="w-full max-w-6xl rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4">
                <h2 className="text-white text-lg font-semibold">User List</h2>

                <div className="flex items-center gap-3">
                    <Search value={searchTerm} onChange={(v) => handleSearchChange(v)} className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" />
                    <button onClick={() => router.push("/dashboard/admin/users/addUser")} className="button-gradient-reverse text-white text-sm px-4 py-1.5 rounded-lg">Add User</button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                    <thead className="button-gradient-reverse text-white px-3 py-4 text-center">
                        <tr>
                            <th className="px-3 py-3 text-center">User Type</th>
                            <th className="px-3 py-3 text-center">Name</th>
                            <th className="px-3 py-3 text-center">Username</th>
                            <th className="px-3 py-3 text-center">Mobil.No</th>
                            <th className="px-3 py-3 text-center">Action</th>
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
                                            No Users Found
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayed.map((u) => (
                                <tr key={u._id} className="border-b hover:bg-gray-50 text-center">
                                    <Td >{u.role}</Td>
                                    <Td >{`${u.firstName || ""} ${u.lastName || ""}`}</Td>
                                    <Td>{u.email || u.username}</Td>
                                    <Td>{u.mobile}</Td>
                                    <Td>
                                        {/* Logic: Agar role 'admin' hai toh action buttons nahi dikhayenge */}
                                        {u.role?.toLowerCase() !== 'admin' && (
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    title="Delete"
                                                    className="text-red-600 hover:scale-110 transition-transform border rounded-md p-1"
                                                    onClick={() => handleDelete(u._id)}
                                                    disabled={actionLoading || u._id === currentUserId}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    title="Edit"
                                                    className="text-indigo-600 hover:scale-110 transition-transform border rounded-md p-1"
                                                    onClick={() => router.push(`/dashboard/admin/users/edit/${u._id}`)}
                                                    disabled={actionLoading}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Optional: Agar aap chahte hain ki Admin ke liye koi text dikhe */}
                                        {u.role?.toLowerCase() === 'admin' && (
                                            <span className="text-gray-400 italic text-xs">Protected</span>
                                        )}
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
