"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axiosConfig";
import { validateVendor } from "@/lib/validation";

export default function AddVendorPage() {
    const router = useRouter();

    // 1. Added poSubmissionRequired to initial state
    const [form, setForm] = useState({
        vendorName: "",
        dealingCompany: "infosware",
        email: "",
        mobile: "",
        poSubmissionRequired: false
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        // 2. Logic to handle Boolean conversion for radio buttons
        const finalValue = type === "radio" ? value === "true" : value;

        setForm((s) => ({ ...s, [name]: finalValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateVendor(form);
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors");
            return;
        }
        setLoading(true);
        try {
            // ensure mobile is number and include PO flag
            const payload = { ...form, mobile: Number(form.mobile), poSubmissionRequired: !!form.poSubmissionRequired };
            await axiosInstance.post("/api/vendor", payload);
            toast.success("Vendor created successfully");
            try { window.dispatchEvent(new CustomEvent('vendors-updated')); } catch (err) { }
            router.push("/dashboard/admin/vendorList");
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Create failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-lg px-12 py-6 shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Vendor Registration</h2>
                </div>

                <div>
                    <button
                        onClick={() => router.push('/dashboard/admin/vendorList')}
                        className="px-3 py-1 border rounded hover:bg-gray-50"
                    >
                        Back
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Vendor Name</label>
                    <input name="vendorName" value={form.vendorName} onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, vendorName: validateVendor({ vendorName: e.target.value }).vendorName }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.vendorName ? 'border-red-500' : ''}`}
                        required
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
                    />
                    {errors.vendorName && <div className="text-sm text-red-600 mt-1">{errors.vendorName}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Dealing Company</label>
                    <select name="dealingCompany" value={form.dealingCompany} onChange={handleChange} className="mt-1 block w-full border rounded p-2">
                        <option value="infosware">Infosware</option>
                        <option value="thinkbotic">Thinkbotic</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, email: validateVendor({ email: e.target.value }).email }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.email ? 'border-red-500' : ''}`}
                        required
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
                    />
                    {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium">Mobile No.</label>
                    <input name="mobile" type="text" value={form.mobile} onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, mobile: validateVendor({ mobile: e.target.value }).mobile }))}
                        className={`mt-1 block w-full border rounded p-2 ${errors.mobile ? 'border-red-500' : ''}`}
                        placeholder="10 digit mobile"
                        required
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                        }}
                    />
                    {errors.mobile && <div className="text-sm text-red-600 mt-1">{errors.mobile}</div>}
                </div>

                {/* 3. Added PO Submission Radio Buttons */}
                <div className="py-2">
                    <label className="block text-sm font-medium mb-2">PO Submission Required?</label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="poSubmissionRequired"
                                value="true"
                                checked={form.poSubmissionRequired === true}
                                onChange={handleChange}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="poSubmissionRequired"
                                value="false"
                                checked={form.poSubmissionRequired === false}
                                onChange={handleChange}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm">No</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="px-6 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    );
}