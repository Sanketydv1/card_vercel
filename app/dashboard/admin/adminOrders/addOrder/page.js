"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "@/lib/axiosConfig";
import { useRouter, useSearchParams } from "next/navigation";
import { validateOrder, validateOrderField } from "@/lib/validation";
import { getImageUrl } from '@/lib/imageUrl';

export default function AddOrderForm({ onSuccess, onCancel }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const repeatId = searchParams.get('repeat');
    // form state
    const [designName, setDesignName] = useState("");
    const [dataType, setDataType] = useState("Variable");
    const [excelFiles, setExcelFiles] = useState([]);
    const [zipFile, setZipFile] = useState(null);
    const [cardPhoto, setCardPhoto] = useState(null);
    const [cardPhotoPreview, setCardPhotoPreview] = useState(null);

    const [cardType, setCardType] = useState("PVC");
    const [finishing, setFinishing] = useState("Matte");
    const [quantity, setQuantity] = useState(100);
    const [modeOfCourier, setModeOfCourier] = useState("BY Air");
    const [fromOption, setFromOption] = useState("INFOSWARE PVT LTD");
    const [to, setTo] = useState("");
    const [pinCode, setPinCode] = useState("");
    const [mobile, setMobile] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // for repeat
    const [originalCardPhoto, setOriginalCardPhoto] = useState(null);

    // validation errors
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (repeatId) {
            // fetch the order for repeat
            axios.get(`/api/sales/${repeatId}`).then(res => {
                if (res.data.success) {
                    const order = res.data.data;
                    // pre-fill the form
                    setDesignName(order.designName || "");
                    setDataType(order.dataType || "Variable");
                    setCardType(order.cardType || "PVC");
                    setFinishing(order.finishing || "Matte");
                    setQuantity(order.quantity || 100);
                    setModeOfCourier(order.modeOfCourier || "By Air");
                    setFromOption(order.from || "INFOSWARE PVT LTD");
                    setTo(order.to || "");
                    setPinCode(order.pinCode || "");
                    setMobile(order.mobile || "");
                    // cardPhoto preview
                    if (order.cardPhoto) {
                        setCardPhotoPreview(getImageUrl(order.cardPhoto));
                        setOriginalCardPhoto(order.cardPhoto);
                        setCardPhoto(order.cardPhoto); // set as string for validation
                    }
                    // Don't set excelFiles or zipFile for repeat
                }
            }).catch(err => {
                toast.error("Failed to load order for repeat");
            });
        }
    }, [repeatId]);

    const handleExcelChange = (e) => {
        const files = Array.from(e.target.files);
        setExcelFiles(prev => {
            const next = [...prev, ...files];
            const err = validateOrderField("excelFiles", next, null);
            setErrors(prevErr => ({ ...prevErr, excelFiles: err }));
            return next;
        });
    };

    const removeExcel = (index) => {
        setExcelFiles(prev => {
            const next = prev.filter((_, i) => i !== index);
            const err = validateOrderField("excelFiles", next, null);
            setErrors(prevErr => ({ ...prevErr, excelFiles: err }));
            return next;
        });
    };

    const handleZipChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setZipFile(f);
            const err = validateOrderField("zipFile", f, null);
            setErrors(prevErr => ({ ...prevErr, zipFile: err }));
        }
    };

    const removeZip = () => {
        setZipFile(null);
        setErrors(prevErr => ({ ...prevErr, zipFile: "" }));
    };

    const handleCardPhotoChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setCardPhoto(f);
            setCardPhotoPreview(URL.createObjectURL(f));
            const err = validateOrderField("cardPhoto", f, null);
            setErrors(prevErr => ({ ...prevErr, cardPhoto: err }));
        }
    };

    const removeCardPhoto = () => {
        setCardPhoto(null);
        setCardPhotoPreview(null);
        setErrors(prevErr => ({ ...prevErr, cardPhoto: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const order = { designName, dataType, excelFiles, zipFile, cardPhoto, cardType, finishing, quantity, modeOfCourier, fromOption, to, pinCode, mobile };
        const validationErrors = validateOrder(order);

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors");
            return;
        }

        try {
            setSubmitting(true);

            // Upload files (if any) to the server using multipart/form-data
            let uploaded = [];
            if ((cardPhoto && cardPhoto instanceof File) || zipFile || (excelFiles && excelFiles.length)) {
                const fd = new FormData();
                if (cardPhoto && cardPhoto instanceof File) fd.append("cardPhoto", cardPhoto);
                if (zipFile) fd.append("uploadZip", zipFile);
                if (excelFiles && excelFiles.length) {
                    excelFiles.forEach((f) => fd.append("uploadExcel", f));
                }

                const upRes = await axios.post("/api/upload", fd);

                if (upRes.data?.success) uploaded = upRes.data.files || [];
                else throw new Error(upRes.data?.message || "Failed to upload files");
            }

            // Build payload - server expects filenames for cardPhoto/uploadFile
            const payload = {
                designName,
                dataType,
                cardType,
                finishing,
                quantity,
                modeOfCourier,
                from: fromOption,
                to,
                pinCode: Number(pinCode),
                mobile: Number(mobile)
            };

            if (repeatId) payload.originalSale = repeatId;

            // card photo filename
            const cardSaved = uploaded.find(f => f.fieldname === 'cardPhoto');
            if (cardSaved) payload.cardPhoto = cardSaved.filename;
            else if (repeatId && originalCardPhoto) payload.cardPhoto = originalCardPhoto;
            // variable data uploads
            if (dataType === 'Variable') {
                const uploadZipFiles = uploaded.filter(f => f.fieldname === 'uploadZip');
                const uploadExcelFiles = uploaded.filter(f => f.fieldname === 'uploadExcel');
                if (uploadZipFiles.length === 1 && zipFile) {
                    payload.uploadZip = uploadZipFiles[0].filename;
                }
                if (uploadExcelFiles.length > 0) {
                    if (uploadExcelFiles.length === 1) {
                        payload.uploadExcel = uploadExcelFiles[0].filename;
                    } else {
                        payload.uploadExcel = uploadExcelFiles.map(f => ({ originalName: f.originalName || f.filename, filename: f.filename }));
                    }
                }
            }

            const res = await axios.post("/api/sales", payload);
            if (res.data?.success) {
                toast.success(res.data.message || "Order created");
                window.dispatchEvent(new CustomEvent("sales-updated"));
                router.push("/dashboard/admin/adminOrders");
            } else {
                toast.error(res.data?.message || "Failed to create order");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Failed to submit order");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-6xl bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Add Card Order</h2>
                </div>

                <div>
                    <button onClick={() => router.push('/dashboard/admin/adminOrders')} className="px-3 py-1 border rounded">Back</button>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-sm font-medium">Design Name <span className="text-red-600">*</span></label>
                        <input
                            value={designName}
                            onChange={(e) => setDesignName(e.target.value)}
                            onBlur={(e) => setErrors(prev => ({ ...prev, designName: validateOrderField('designName', e.target.value) }))}
                            className={`w-full mt-1 px-3 py-2 border rounded ${errors.designName ? 'border-red-500' : ''}`}
                            onInput={(e) => {
                                e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                            }}
                        />
                        {errors.designName && <div className="text-sm text-red-600 mt-1">{errors.designName}</div>}
                    </div>

                    <div>
                        <label className="text-sm font-medium">Data Type <span className="text-red-600">*</span></label>
                        <select value={dataType} onChange={(e) => { const v = e.target.value; setDataType(v); if (v !== 'Variable') { setExcelFiles([]); setZipFile(null); setErrors(prev => ({ ...prev, excelFiles: '', zipFile: '' })); } }} className="w-full mt-1 px-3 py-2 border rounded">
                            <option value="Variable">Variable</option>
                            <option value="Fixed">Fixed</option>
                        </select>
                    </div>

                    {dataType === 'Variable' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border rounded-lg p-4 bg-white shadow-sm">
                                    <label className="text-sm font-semibold text-gray-700">Upload Excel Files <span className="text-red-600">*</span></label>
                                    <input type="file" multiple accept=".xlsx,.xls,.csv" onChange={handleExcelChange} className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />

                                    <div className="mt-3 space-y-2">
                                        {excelFiles.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                                                <span className="text-sm text-gray-700 truncate">{f.name}</span>
                                                <button type="button" onClick={() => removeExcel(i)} className="text-sm text-red-600 hover:underline">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.excelFiles && (<p className="text-sm text-red-600 mt-2">{errors.excelFiles}</p>)}
                                </div>

                                <div className="border rounded-lg p-4 bg-white shadow-sm">
                                    <label className="text-sm font-semibold text-gray-700">Upload ZIP File</label>
                                    <input type="file" accept=".zip" onChange={handleZipChange} className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
                                    {zipFile && (<div className="mt-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2"><span className="text-sm text-gray-700 truncate">{zipFile.name}</span><button type="button" onClick={removeZip} className="text-sm text-red-600 hover:underline">Remove</button></div>)}
                                    {errors.zipFile && (<p className="text-sm text-red-600 mt-2">{errors.zipFile}</p>)}
                                </div>

                            </div>

                        </>
                    )}


                    <div className="border rounded-lg p-4 bg-white shadow-sm">
                        <label className="text-sm font-semibold text-gray-700">Upload Card Photo <span className="text-red-600">*</span></label>
                        <input type="file" accept="image/*" onChange={handleCardPhotoChange} className={`mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer ${errors.cardPhoto ? 'border border-red-500 rounded-md p-1' : ''}`} />
                        {errors.cardPhoto && (<p className="text-sm text-red-600 mt-2">{errors.cardPhoto}</p>)}
                        {cardPhotoPreview && (<div className="mt-4 flex items-start gap-4"><img src={cardPhotoPreview} alt="Card preview" className="w-32 h-16 object-cover rounded-md border" /><div className="flex flex-col gap-2"><span className="text-sm text-gray-600">Preview</span><button type="button" onClick={removeCardPhoto} className="text-sm text-red-600 hover:underline">Remove photo</button></div></div>)}
                    </div>

                </div>

                <hr />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Card Type <span className="text-red-600">*</span></label>
                        <select value={cardType} onChange={(e) => setCardType(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                            <option value="PVC">PVC</option>
                            <option value="Maifair1k">Maifair 1K</option>
                            <option value="Proximity">Proximity</option>
                            <option value="UHF">UHF</option>
                            <option value="NFC213">NFC 213</option>
                            <option value="NFC216">NFC 216</option>
                            <option value="Maifair4k">Maifair 4K</option>
                            <option value="Others">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Finishing <span className="text-red-600">*</span></label>
                        <select value={finishing} onChange={(e) => setFinishing(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                            <option value="Matte">Matte</option>
                            <option value="Gloss">Gloss</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Quantity <span className="text-red-600">*</span></label>
                        <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} onBlur={(e) => setErrors(prev => ({ ...prev, quantity: validateOrderField('quantity', e.target.value) }))} className={`w-full mt-1 px-2 py-[6px] border rounded ${errors.quantity ? 'border-red-500' : ''}`} />
                        {errors.quantity && <div className="text-sm text-red-600 mt-1">{errors.quantity}</div>}
                    </div>


                    <div>
                        <label className="text-sm font-medium">Mode of Courier <span className="text-red-600">*</span></label>
                        <select value={modeOfCourier} onChange={(e) => setModeOfCourier(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                            <option value="Urgent">Urgent</option>
                            <option value="BY Air">BY Air</option>
                            <option value="BY Road">BY Road</option>
                            <option value="By Train">By Train</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium">From <span className="text-red-600">*</span></label>
                    <select value={fromOption} onChange={(e) => setFromOption(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                        <option value="INFOSWARE PVT LTD">INFOSWARE PVT LTD</option>
                        <option value="THINKBOTIC TECHNOLOGY PVT LTD">THINKBOTIC TECHNOLOGY PVT LTD</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm font-medium">
                        To <span className="text-red-600">*</span>
                    </label>

                    <textarea
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        onBlur={(e) =>
                            setErrors((prev) => ({
                                ...prev,
                                to: validateOrderField("to", e.target.value),
                            }))
                        }
                        rows={4}
                        className={`w-full mt-1 px-3 py-2 border rounded resize-none ${errors.to ? "border-red-500" : ""
                            }`}
                        onInput={(e) => {
                            e.target.value = e.target.value.replace(/^\s+/, "");
                        }}
                    />

                    {errors.to && (
                        <div className="text-sm text-red-600 mt-1">{errors.to}</div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Pin Code <span className="text-red-600">*</span></label>
                        <input value={pinCode} onChange={(e) => setPinCode(e.target.value)} onBlur={(e) => setErrors(prev => ({ ...prev, pinCode: validateOrderField('pinCode', e.target.value) }))} className={`w-full mt-1 px-3 py-2 border rounded ${errors.pinCode ? 'border-red-500' : ''}`}
                            onInput={(e) => {
                                e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                            }}
                        />
                        {errors.pinCode && <div className="text-sm text-red-600 mt-1">{errors.pinCode}</div>}
                    </div>

                    <div>
                        <label className="text-sm font-medium">Mobile No. <span className="text-red-600">*</span></label>
                        <input value={mobile} onChange={(e) => setMobile(e.target.value)} onBlur={(e) => setErrors(prev => ({ ...prev, mobile: validateOrderField('mobile', e.target.value) }))} className={`w-full mt-1 px-3 py-2 border rounded ${errors.mobile ? 'border-red-500' : ''}`}
                            onInput={(e) => {
                                e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                            }}
                        />
                        {errors.mobile && <div className="text-sm text-red-600 mt-1">{errors.mobile}</div>}
                    </div>


                    <div className="flex items-center gap-3 mt-4">
                        <button type="submit" disabled={submitting} className="button-gradient px-4 py-2 rounded">{submitting ? 'Submitting...' : 'Submit'}</button>
                        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
