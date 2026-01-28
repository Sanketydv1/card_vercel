"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import axios from "../../../../../../lib/axiosConfig";
import { getImageUrl } from '@/lib/imageUrl';
import { Download } from 'lucide-react';
import { validateOrder, validateOrderField } from "../../../../../../lib/validation";

export default function EditOrderPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [designName, setDesignName] = useState("");
    const [dataType, setDataType] = useState("variable");
    const [cardPhotoPreview, setCardPhotoPreview] = useState(null);
    const [cardPhoto, setCardPhoto] = useState(null); // new file if replaced
    const [cardType, setCardType] = useState("pvc");
    const [finishing, setFinishing] = useState("matte");
    const [quantity, setQuantity] = useState(100);
    const [modeOfCourier, setModeOfCourier] = useState("byair");
    const [fromOption, setFromOption] = useState("infosware");
    const [to, setTo] = useState("");
    const [pinCode, setPinCode] = useState("");
    const [mobile, setMobile] = useState("");

    // variable upload states (mirror Add page)
    const [excelFiles, setExcelFiles] = useState([]);
    const [zipFile, setZipFile] = useState(null);

    // existing upload preview info (from server)
    // keep excels and zip separate so both can be shown simultaneously
    const [uploadExistingExcels, setUploadExistingExcels] = useState([]); // array of { name, filename }
    const [uploadExistingZip, setUploadExistingZip] = useState(null); // { name, filename } or null
    const [uploadExistingRaw, setUploadExistingRaw] = useState(null); // raw string from server (JSON or dataURL)

    useEffect(() => {
        let mounted = true;
        const fetchSale = async () => {
            try {
                const res = await axios.get(`/api/sales/${id}`);
                if (!mounted) return;
                if (res.data?.success) {
                    const s = res.data.data;
                    setDesignName(s.designName || "");
                    setDataType(s.dataType || "variable");
                    setCardPhotoPreview(s.cardPhoto || null);
                    setCardType(s.cardType || "pvc");
                    setFinishing(s.finishing || "matte");
                    setQuantity(s.quantity || 100);
                    setModeOfCourier(s.modeOfCourier || "byair");
                    setFromOption(s.from || "infosware");
                    setTo(s.to || "");
                    setPinCode(s.pinCode ? String(s.pinCode) : "");
                    setMobile(s.mobile ? String(s.mobile) : "");

                    // upload can be stored under multiple fields depending on how the order was created:
                    // - s.uploadFile (legacy, JSON string or single filename)
                    // - s.uploadFiles (array of file objects)
                    // - s.uploadZip (single filename string)
                    // collect both existing excels and zip so both can be shown
                    const existingExcels = [];
                    let existingZip = null;

                    if (s.uploadFile) {
                        setUploadExistingRaw(s.uploadFile);
                        try {
                            const parsed = JSON.parse(s.uploadFile);
                            if (Array.isArray(parsed)) {
                                existingExcels.push(...parsed.map(f => ({ name: f.name || f.originalName || f.filename || 'file', filename: f.filename || f.name || '' })));
                            } else {
                                const fname = String(s.uploadFile);
                                existingZip = { name: fname.split('/').pop(), filename: fname };
                            }
                        } catch (err) {
                            if (typeof s.uploadFile === 'string') {
                                const fname = s.uploadFile;
                                existingZip = { name: fname.split('/').pop(), filename: fname };
                            }
                        }
                    }

                    if (Array.isArray(s.uploadFiles) && s.uploadFiles.length) {
                        existingExcels.push(...s.uploadFiles.map(f => ({ name: f.name || f.originalName || f.filename || 'file', filename: f.filename || f.name || '' })));
                    }

                    if (s.uploadExcel) {
                        setUploadExistingRaw(s.uploadExcel);
                        if (typeof s.uploadExcel === 'string') {
                            const fname = String(s.uploadExcel);
                            existingExcels.push({ name: fname.split('/').pop(), filename: fname });
                        } else if (Array.isArray(s.uploadExcel)) {
                            existingExcels.push(...s.uploadExcel.map(f => ({ name: f.originalName || f.name || f.filename || 'file', filename: f.filename || f.name || '' })));
                        }
                    }

                    if (s.uploadZip) {
                        const fname = String(s.uploadZip);
                        existingZip = { name: fname.split('/').pop(), filename: fname };
                        setUploadExistingRaw(s.uploadZip);
                    }

                    setUploadExistingExcels(existingExcels);
                    setUploadExistingZip(existingZip);
                } else {
                    toast.error(res.data?.message || "Failed to load sale");
                    router.push('/dashboard/sales/orders');
                }
            } catch (err) {
                toast.error(err?.message || 'Failed to load sale');
                router.push('/dashboard/sales/orders');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchSale();
        return () => (mounted = false);
    }, [id]);

    const handleCardPhotoChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setCardPhoto(f);
            setCardPhotoPreview(URL.createObjectURL(f));
            setErrors(prevErr => ({ ...prevErr, cardPhoto: validateOrderField('cardPhoto', f) }));
        }
    };

    const handleExcelChange = (e) => {
        const files = Array.from(e.target.files);
        setExcelFiles(prev => {
            const next = [...prev, ...files];
            const err = validateOrderField('excelFiles', next);
            setErrors(prevErr => ({ ...prevErr, excelFiles: err }));
            return next;
        });
        // if user selects new excels, clear any existing excel previews
        setUploadExistingExcels([]);
    };

    const removeExcel = (index) => {
        setExcelFiles(prev => {
            const next = prev.filter((_, i) => i !== index);
            const err = validateOrderField('excelFiles', next);
            setErrors(prevErr => ({ ...prevErr, excelFiles: err }));
            return next;
        });
    };

    const handleZipChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setZipFile(f);
            setErrors(prevErr => ({ ...prevErr, zipFile: validateOrderField('zipFile', f) }));
            // if user selects new zip, clear existing zip preview only
            setUploadExistingZip(null);
        }
    };

    const removeZip = () => {
        setZipFile(null);
        setErrors(prevErr => ({ ...prevErr, zipFile: '' }));
    };

    const removeExistingExcel = (index) => {
        setUploadExistingExcels(prev => prev.filter((_, i) => i !== index));
        setUploadExistingRaw(null);
    };

    const removeExistingZip = () => {
        setUploadExistingZip(null);
        setUploadExistingRaw(null);
    };

    const removeCardPhoto = () => {
        setCardPhoto(null);
        setCardPhotoPreview(null);
        setErrors(prevErr => ({ ...prevErr, cardPhoto: '' }));
    };


    const readFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // build order object for client-side validation
        const order = { designName, dataType, cardPhoto: cardPhoto || cardPhotoPreview, cardType, finishing, quantity, modeOfCourier, fromOption, to, pinCode, mobile };

        if (dataType === 'variable') {
            // excel files: prefer newly selected, otherwise existing excels
            if (excelFiles && excelFiles.length) order.excelFiles = excelFiles;
            else if (uploadExistingExcels && uploadExistingExcels.length) order.excelFiles = uploadExistingExcels.map(f => ({ name: f.name }));

            // zip: prefer newly selected, otherwise existing zip
            if (zipFile) order.zipFile = zipFile;
            else if (uploadExistingZip) order.zipFile = { name: uploadExistingZip.name };
        }

        const validationErrors = validateOrder(order);
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error('Please fix validation errors');
            return;
        }

        try {
            setSubmitting(true);

            // If any new files are selected, upload them first
            let uploaded = [];
            if (cardPhoto || zipFile || (excelFiles && excelFiles.length)) {
                const fd = new FormData();
                if (cardPhoto) fd.append("cardPhoto", cardPhoto);
                if (zipFile) fd.append("uploadZip", zipFile);
                if (excelFiles && excelFiles.length) excelFiles.forEach(f => fd.append("uploadExcel", f));

                const upRes = await axios.post('/api/upload', fd);
                if (upRes.data?.success) uploaded = upRes.data.files || [];
                else throw new Error(upRes.data?.message || 'Failed to upload files');
            }

            const payload = {
                designName,
                dataType,
                cardType,
                finishing,
                quantity,
                modeOfCourier,
                from: fromOption,
                to,
                pinCode,
                mobile
            };

            // card photo - prefer newly uploaded filename, else keep existing string
            const cardSaved = uploaded.find(f => f.fieldname === 'cardPhoto');
            if (cardSaved) payload.cardPhoto = cardSaved.filename;
            else if (cardPhotoPreview) payload.cardPhoto = cardPhotoPreview;

            // variable uploads - prefer newly uploaded files; fall back to existing values when not replaced
            if (dataType === 'variable') {
                const uploadZipFiles = uploaded.filter(f => f.fieldname === 'uploadZip');
                const uploadExcelFiles = uploaded.filter(f => f.fieldname === 'uploadExcel');

                // ZIP: prefer newly uploaded zip, otherwise keep existing zip if present
                if (uploadZipFiles.length === 1 && zipFile) {
                    payload.uploadZip = uploadZipFiles[0].filename; // single zip filename
                } else if (!zipFile && uploadExistingZip) {
                    payload.uploadZip = uploadExistingZip.filename;
                }

                // Excel: prefer newly uploaded excel files, otherwise keep existing excel files if present
                if (uploadExcelFiles.length > 0) {
                    if (uploadExcelFiles.length === 1) {
                        payload.uploadExcel = uploadExcelFiles[0].filename;
                    } else {
                        payload.uploadExcel = uploadExcelFiles.map(f => ({ originalName: f.originalName || f.filename, filename: f.filename }));
                    }
                } else if (uploadExistingExcels && uploadExistingExcels.length) {
                    if (uploadExistingExcels.length === 1) {
                        payload.uploadExcel = uploadExistingExcels[0].filename;
                    } else {
                        payload.uploadExcel = uploadExistingExcels.map(f => ({ originalName: f.name || f.originalName || f.filename, filename: f.filename || f.name }));
                    }
                }
            }

            const res = await axios.put(`/api/sales/${id}`, payload);
            if (res.data?.success) {
                toast.success('Order updated');
                window.dispatchEvent(new CustomEvent('sales-updated', { detail: { id } }));
                router.push('/dashboard/admin/adminOrders');
            } else {
                toast.error(res.data?.message || 'Failed to update');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Edit Card Order</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push("/dashboard/admin/adminOrders")} className="px-3 py-1 rounded border">Back</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-sm font-medium">Design Name <span className="text-red-600">*</span></label>
                            <input
                                value={designName}
                                onChange={(e) => setDesignName(e.target.value)}
                                onInput={(e) => { e.target.value = e.target.value.replace(/^\s+/, ""); }}
                                onBlur={(e) => setErrors(prev => ({ ...prev, designName: validateOrderField('designName', e.target.value) }))}
                                className={`w-full mt-1 px-3 py-2 border rounded ${errors.designName ? 'border-red-500' : ''}`}
                            />
                            {errors.designName && <div className="text-sm text-red-600 mt-1">{errors.designName}</div>}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Data Type <span className="text-red-600">*</span></label>
                            <select value={dataType} onChange={(e) => {
                                const v = e.target.value;
                                setDataType(v);
                                if (v !== 'variable') {
                                    setExcelFiles([]);
                                    setZipFile(null);
                                    setUploadExistingExcels([]);
                                    setUploadExistingZip(null);
                                    setUploadExistingRaw(null);
                                    setErrors(prev => ({ ...prev, excelFiles: '', zipFile: '' }));
                                }
                            }} className="w-full mt-1 px-3 py-2 border rounded">
                                <option value="variable">Variable</option>
                                <option value="fixed">Fixed</option>
                            </select>
                        </div>

                        {dataType === 'variable' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Excel Upload */}
                                    <div className="border rounded-lg p-4 bg-white shadow-sm">
                                        <label className="text-sm font-semibold text-gray-700">
                                            Upload Excel Files <span className="text-red-600">*</span>
                                        </label>

                                        <input
                                            type="file"
                                            multiple
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleExcelChange}
                                            className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                        />

                                        {/* Selected Excel Files (new) */}
                                        <div className="mt-3 space-y-2">
                                            {excelFiles.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                                                    <span className="text-sm text-gray-700 truncate">{f.name}</span>
                                                    <button type="button" onClick={() => removeExcel(i)} className="text-sm text-red-600 hover:underline">Remove</button>
                                                </div>
                                            ))}

                                            {/* Existing Excel preview from server */}
                                            {uploadExistingExcels.length > 0 && uploadExistingExcels.map((f, i) => {
                                                const name = f.name;
                                                const filename = f.filename;
                                                return (
                                                    <div key={`existing-${i}`} className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                                                        <span className="text-sm text-gray-700 truncate">{name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <a href={typeof filename === 'string' && !filename.startsWith('http') && !filename.startsWith('data:') ? getImageUrl(filename) : filename} download aria-label={`Download ${name}`} className="text-blue-600 hover:text-blue-800">
                                                                <Download size={16} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {errors.excelFiles && (
                                            <p className="text-sm text-red-600 mt-2">{errors.excelFiles}</p>
                                        )}
                                    </div>

                                    {/* ZIP Upload */}
                                    <div className="border rounded-lg p-4 bg-white shadow-sm">
                                        <label className="text-sm font-semibold text-gray-700">Upload ZIP File</label>

                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={handleZipChange}
                                            className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                        />

                                        {zipFile && (
                                            <div className="mt-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                                                <span className="text-sm text-gray-700 truncate">{zipFile.name}</span>
                                                <button type="button" onClick={removeZip} className="text-sm text-red-600 hover:underline">Remove</button>
                                            </div>
                                        )}

                                        {/* Existing ZIP preview */}
                                        {uploadExistingZip && uploadExistingZip.filename && (
                                            <div className="mt-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                                                <span className="text-sm text-gray-700 truncate">{uploadExistingZip.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <a href={typeof uploadExistingZip.filename === 'string' && !uploadExistingZip.filename.startsWith('http') && !uploadExistingZip.filename.startsWith('data:') ? getImageUrl(uploadExistingZip.filename) : uploadExistingZip.filename} download aria-label={`Download ${uploadExistingZip.name}`} className="text-blue-600 hover:text-blue-800">
                                                        <Download size={16} />
                                                    </a>
                                                    {/* <button type="button" onClick={removeExistingZip} className="text-sm text-red-600 hover:underline">Remove</button> */}
                                                </div>
                                            </div>
                                        )}

                                        {errors.zipFile && (
                                            <p className="text-sm text-red-600 mt-2">{errors.zipFile}</p>
                                        )}
                                    </div>

                                </div>

                            </>
                        )}

                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                            <label className="text-sm font-semibold text-gray-700">Upload Card Photo <span className="text-red-600">*</span></label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCardPhotoChange}
                                className={`mt-2 block w-full text-sm
                                             file:mr-4 file:py-2 file:px-4
                                             file:rounded-md file:border-0
                                             file:bg-indigo-50 file:text-indigo-700
                                             hover:file:bg-indigo-100 cursor-pointer
                                             ${errors.cardPhoto ? 'border border-red-500 rounded p-1' : ''}
                                           `}
                            />

                            {errors.cardPhoto && (
                                <p className="text-sm text-red-600 mt-2">{errors.cardPhoto}</p>
                            )}

                            {cardPhotoPreview && (
                                <div className="mt-4 flex items-start gap-4">
                                    <img src={cardPhotoPreview ? (typeof cardPhotoPreview === 'string' && !cardPhotoPreview.startsWith('data:') ? getImageUrl(cardPhotoPreview) : cardPhotoPreview) : ''} alt="Card preview" className="w-32 h-16 object-cover rounded-md border" />

                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm text-gray-600">Preview</span>
                                        <button type="button" onClick={removeCardPhoto} className="text-sm text-red-600 hover:underline">Remove photo</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <hr />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Card Type <span className="text-red-600">*</span></label>
                            <select value={cardType} onChange={(e) => setCardType(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                                <option value="pvc">PVC</option>
                                <option value="maifair1k">Maifair 1K</option>
                                <option value="proximity">Proximity</option>
                                <option value="uhf">UHF</option>
                                <option value="nfc213">NFC 213</option>
                                <option value="nfc216">NFC 216</option>
                                <option value="maifair4k">Maifair 4K</option>
                                <option value="others">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Finishing <span className="text-red-600">*</span></label>
                            <select value={finishing} onChange={(e) => setFinishing(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                                <option value="matte">Matte</option>
                                <option value="gloss">Glossy</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Quantity <span className="text-red-600">*</span></label>
                            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} onBlur={(e) => setErrors(prev => ({ ...prev, quantity: validateOrderField('quantity', e.target.value) }))} className={`w-full mt-1 px-3 py-[6px] border rounded ${errors.quantity ? 'border-red-500' : ''}`} />
                            {errors.quantity && <div className="text-sm text-red-600 mt-1">{errors.quantity}</div>}
                        </div>



                        <div>
                            <label className="text-sm font-medium">Mode of Courier <span className="text-red-600">*</span></label>
                            <select value={modeOfCourier} onChange={(e) => setModeOfCourier(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                                <option value="urgent">Urgent</option>
                                <option value="byair">By Air</option>
                                <option value="byroad">By Road</option>
                                <option value="bytrain">By Train</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-sm font-medium">From <span className="text-red-600">*</span></label>
                            <select value={fromOption} onChange={(e) => setFromOption(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded">
                                <option value="infosware">Infosware Pvt. Ltd</option>
                                <option value="thinkbotic">Thinkbotic</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">To <span className="text-red-600">*</span></label>
                            <input value={to} onChange={(e) => setTo(e.target.value)} onInput={(e) => { e.target.value = e.target.value.replace(/^\s+/, ""); }} onBlur={(e) => setErrors(prev => ({ ...prev, to: validateOrderField('to', e.target.value) }))} className={`w-full mt-1 px-3 py-8 border rounded ${errors.to ? 'border-red-500' : ''}`} />
                            {errors.to && <div className="text-sm text-red-600 mt-1">{errors.to}</div>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Pin Code <span className="text-red-600">*</span></label>
                            <input value={pinCode} onChange={(e) => setPinCode(e.target.value)} onInput={(e) => { e.target.value = e.target.value.replace(/^\s+/, ""); }} onBlur={(e) => setErrors(prev => ({ ...prev, pinCode: validateOrderField('pinCode', e.target.value) }))} className={`w-full mt-1 px-3 py-2 border rounded ${errors.pinCode ? 'border-red-500' : ''}`} />
                            {errors.pinCode && <div className="text-sm text-red-600 mt-1">{errors.pinCode}</div>}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Mobile No. <span className="text-red-600">*</span></label>
                            <input value={mobile} onChange={(e) => setMobile(e.target.value)} onInput={(e) => { e.target.value = e.target.value.replace(/^\s+/, ""); }} onBlur={(e) => setErrors(prev => ({ ...prev, mobile: validateOrderField('mobile', e.target.value) }))} className={`w-full mt-1 px-3 py-2 border rounded ${errors.mobile ? 'border-red-500' : ''}`} />
                            {errors.mobile && <div className="text-sm text-red-600 mt-1">{errors.mobile}</div>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded">{submitting ? 'Updating...' : 'Update'}</button>
                        <button type="button" onClick={() => router.push("/dashboard/admin/adminOrders")} className="px-4 py-2 border rounded">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
