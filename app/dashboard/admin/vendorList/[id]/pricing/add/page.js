"use client";
import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { validatePricing } from "@/lib/validation";

export default function AddPricingPage({ params }) {
    const { id } = React.use(params);
    const router = useRouter();
    const [vendor, setVendor] = useState(null);
    const [form, setForm] = useState({ cardType: "pvc", dataType: "fixed", quantityFrom: "", quantityTo: "", price: "", notes: "" });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const loadVendor = async () => {
            try {
                const res = await axiosInstance.get(`/api/vendor/${id}`);
                setVendor(res.data?.data || null);
            } catch (err) {
                toast.error(err?.response?.data?.message || "Failed to load vendor");
            }
        };
        loadVendor();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(s => ({ ...s, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validatePricing(form);
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors");
            return;
        }
        setLoading(true);
        try {
            if (Number(form.quantityFrom) > Number(form.quantityTo)) {
                toast.error("Quantity From cannot be greater than Quantity To");
                setLoading(false);
                return;
            }
            await axiosInstance.post(`/api/vendor/${id}/pricing`, form);
            toast.success("Pricing added");
            try { window.dispatchEvent(new CustomEvent('vendors-updated')); } catch (err) { }
            router.push(`/dashboard/admin/vendorList/${id}/pricing`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Add failed");
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-6xl min-h-132 mx-auto bg-white rounded-lg px-10 py-6 shadow">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold">Add Pricing</h2>
                    {vendor && <div className="text-sm text-gray-600">Vendor: <strong>{vendor.vendorName}</strong> — {vendor.dealingCompany}</div>}
                </div>
                <div>
                    <button onClick={() => router.back()} className="px-3 py-1 border rounded">Back</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">

                {/* Card Type */}
                <div>
                    <label className="block text-sm mb-1">Card Type</label>
                    <select
                        name="cardType"
                        value={form.cardType}
                        onChange={handleChange}
                        className="block w-full border rounded p-2"
                    >
                        <option value="pvc">PVC</option>
                        <option value="maifair1k">Maifair 1K</option>
                        <option value="proximity">Proximity</option>
                        <option value="uhf">UHF</option>
                        <option value="nfc213">NFC213</option>
                        <option value="nfc216">NFC216</option>
                        <option value="maifair4k">Maifair 4K</option>
                        <option value="others">Others</option>
                    </select>
                </div>

                {/* Data Type */}
                <div>
                    <label className="block text-sm mb-1">Data Type</label>
                    <select
                        name="dataType"
                        value={form.dataType}
                        onChange={handleChange}
                        className="block w-full border rounded p-2"
                    >
                        <option value="fixed">Fixed</option>
                        <option value="variable">Variable</option>
                    </select>
                </div>

                {/* Quantity From */}
                <div>
                    <label className="block text-sm mb-1">Quantity From</label>
                    <input
                        name="quantityFrom"
                        value={form.quantityFrom}
                        onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, ""); // only numbers
                            if (v.length > 1 && v.startsWith("0")) v = v.slice(1); // no 0123
                            setForm(prev => ({ ...prev, quantityFrom: v }));
                        }}
                        onBlur={(e) =>
                            setErrors(prev => ({
                                ...prev,
                                quantityFrom: validatePricing({ quantityFrom: e.target.value }).quantityFrom
                            }))
                        }
                        className={`block w-full border rounded p-2 ${errors.quantityFrom ? "border-red-500" : ""
                            }`}
                    />
                    {errors.quantityFrom && (
                        <div className="text-sm text-red-600 mt-1">{errors.quantityFrom}</div>
                    )}
                </div>


                {/* Quantity To */}
                <div>
                    <label className="block text-sm mb-1">Quantity To</label>
                    <input
                        name="quantityTo"
                        value={form.quantityTo}
                        onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, ""); // only digits
                            if (v.length > 1 && v.startsWith("0")) v = v.slice(1); // no 0123
                            setForm(prev => ({ ...prev, quantityTo: v }));
                        }}
                        onBlur={(e) =>
                            setErrors(prev => ({
                                ...prev,
                                quantityTo: validatePricing({ quantityTo: e.target.value }).quantityTo
                            }))
                        }
                        className={`block w-full border rounded p-2 ${errors.quantityTo ? "border-red-500" : ""
                            }`}
                    />
                    {errors.quantityTo && (
                        <div className="text-sm text-red-600 mt-1">{errors.quantityTo}</div>
                    )}
                </div>


                {/* Price */}
                <div>
                    <label className="block text-sm mb-1">Price</label>
                    <input
                        name="price"
                        value={form.price}
                        onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, ""); // only digits
                            if (v.length > 1 && v.startsWith("0")) v = v.slice(1); // no 0123
                            setForm(prev => ({ ...prev, price: v }));
                        }}
                        onBlur={(e) =>
                            setErrors(prev => ({
                                ...prev,
                                price: validatePricing({ price: e.target.value }).price
                            }))
                        }
                        className={`block w-full border rounded p-2 ${errors.price ? "border-red-500" : ""
                            }`}
                    />
                    {errors.price && (
                        <div className="text-sm text-red-600 mt-1">{errors.price}</div>
                    )}
                </div>


                {/* Notes */}
                <div>
                    <label className="block text-sm mb-1">Notes</label>
                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        onBlur={(e) => setErrors(prev => ({ ...prev, notes: validatePricing({ notes: e.target.value }).notes }))}
                        maxLength={50}
                        rows={3}
                        placeholder="Max 50 Characters"
                        className={`block w-full border rounded p-2 resize-none ${errors.notes ? 'border-red-500' : ''}`}
                        onInput={(e) => (e.target.value = e.target.value.replace(/^\s+/, ""))}
                    />
                    {errors.notes && <div className="text-sm text-red-600 mt-1">{errors.notes}</div>}
                </div>

                {/* Submit Button */}
                <div className="text-left">
                    <button
                        type="submit"
                        className="px-6 py-2 rounded button-gradient text-white"
                        disabled={loading}
                    >
                        {loading ? "Adding..." : "Submit"}
                    </button>
                </div>

            </form>

        </div>
    );
}