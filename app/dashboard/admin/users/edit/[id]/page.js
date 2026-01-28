"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axiosInstance from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { validateUser } from "@/lib/validation";

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        role: "sale",
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        mobile: "",
    });
    const [errors, setErrors] = useState({});

    const roles = [
        { value: "sale", label: "Sale Executive" },
        { value: "graphic", label: "Graphic Designer" },
        { value: "account", label: "Accountant" },
        { value: "admin", label: "Admin" },
        { value: "customer", label: "Customer" },
    ];

    useEffect(() => {
        if (!id) return;
        let mounted = true;
        const fetchUser = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/api/user/${id}`);
                const u = res.data?.data || {};
                if (!mounted) return;
                setForm({
                    role: u.role || "sale",
                    firstName: u.firstName || "",
                    lastName: u.lastName || "",
                    username: u.username || "",
                    email: u.email || "",
                    mobile: u.mobile || "",
                });
            } catch (err) {
                toast.error(err?.response?.data?.message || "Failed to fetch user");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchUser();
        return () => (mounted = false);
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!id) return;
        const validationErrors = validateUser(form);
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors");
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.put(`/api/user/${id}`, form);
            toast.success("User updated");
            try { window.dispatchEvent(new CustomEvent('users-updated', { detail: { id } })); } catch (err) { }
            router.push("/dashboard/admin/users");
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-4 bg-white">Loading user...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-lg px-12 py-4 shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Edit User</h2>
                </div>

                <div>
                    <button onClick={() => router.push('/dashboard/admin/users')} className="px-3 py-1 border rounded">Back</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">User Type</label>
                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        className="mt-1 block w-full border rounded p-2"
                    >
                        {roles.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">First Name</label>
                        <input
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            onBlur={(e) => setErrors(prev => ({ ...prev, firstName: validateUser({ firstName: e.target.value }).firstName }))}
                            className={`mt-1 block w-full border rounded p-2 ${errors.firstName ? 'border-red-500' : ''}`}
                            required
                        />
                        {errors.firstName && <div className="text-sm text-red-600 mt-1">{errors.firstName}</div>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Last Name</label>
                        <input
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            onBlur={(e) => setErrors(prev => ({ ...prev, lastName: validateUser({ lastName: e.target.value }).lastName }))}
                            className={`mt-1 block w-full border rounded p-2 ${errors.lastName ? 'border-red-500' : ''}`}
                            required
                        />
                        {errors.lastName && <div className="text-sm text-red-600 mt-1">{errors.lastName}</div>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">Username</label>
                    <input
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, username: validateUser({ username: e.target.value }).username }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.username ? 'border-red-500' : ''}`}
                        required
                    />
                    {errors.username && <div className="text-sm text-red-600 mt-1">{errors.username}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, email: validateUser({ email: e.target.value }).email }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.email ? 'border-red-500' : ''}`}
                        required
                    />
                    {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Mobile No.</label>
                    <input
                        name="mobile"
                        type="text"
                        value={form.mobile}
                        onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, mobile: validateUser({ mobile: e.target.value }).mobile }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.mobile ? 'border-red-500' : ''}`}
                        placeholder="10 digit mobile"
                        required
                    />
                    {errors.mobile && <div className="text-sm text-red-600 mt-1">{errors.mobile}</div>}
                </div>

                <div>
                    <button
                        type="submit"
                        className="px-6 py-2 rounded bg-indigo-600 text-white"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
