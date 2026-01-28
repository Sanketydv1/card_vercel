"use client";
import { useState } from "react";
import axiosInstance from "@/lib/axiosConfig";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { validateUser } from "@/lib/validation";

export default function AddUserPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        role: "sale",
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        mobile: "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const roles = [
        { value: "sale", label: "Sale Executive" },
        { value: "graphic", label: "Graphic Designer" },
        { value: "account", label: "Accountant" },
        { value: "admin", label: "Admin" },
        { value: "customer", label: "Customer" },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateUser(form);
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors");
            return;
        }
        setLoading(true);
        try {
            const res = await axiosInstance.post("/api/user", form);
            toast.success("User created successfully");
            // notify other pages (user list) to refresh
            try { window.dispatchEvent(new CustomEvent('users-updated', { detail: res.data?.data || {} })); } catch (err) { /* ignore */ }
            router.push("/dashboard/admin/users");
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-lg px-12 py-4 shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Add User</h2>
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
                            onInput={(e) => {
                                e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                            }}
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
                            onInput={(e) => {
                                e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                            }}
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
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
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
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
                    />
                    {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Password</label>
                    <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, password: validateUser({ password: e.target.value }).password }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.password ? 'border-red-500' : ''}`}
                        required
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
                    />
                    {errors.password && <div className="text-sm text-red-600 mt-1">{errors.password}</div>}
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
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
                    />
                    {errors.mobile && <div className="text-sm text-red-600 mt-1">{errors.mobile}</div>}
                </div>

                <div>
                    <button
                        type="submit"
                        className="px-6 button-gradient py-2 rounded bg-indigo-600 text-white"
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    );
}
