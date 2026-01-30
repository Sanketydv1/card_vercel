export const validateEmail = (email) => {
    if (!email || !email.trim()) return "Email is required";
    const re = /^\S+@\S+\.\S+$/;
    if (!re.test(email)) return "Please enter a valid email address";
    return "";
};

export const validatePassword = (password) => {
    if (!password || !password.trim()) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
};

export const validateLogin = ({ email, password }) => {
    const errors = {};
    const e = validateEmail(email);
    if (e) errors.email = e;
    const p = validatePassword(password);
    if (p) errors.password = p;
    return errors;
};

export const validateField = (field, value) => {
    if (field === "email") return validateEmail(value);
    if (field === "password") return validatePassword(value);
    return "";
};

// ================= COMMON VALIDATORS =================
const validators = {
    designName: (v) =>
        !v || !v.trim() ? "Design name is required" : "",

    excelFiles: (v) => {
        // Excel files are now optional for Variable data type
        if (!v || !v.length) return ""; // No error if empty
        const files = Array.from(v);
        return files.find((f) => !/\.(xlsx|xls|csv)$/i.test(f.name))
            ? "Excel files must be .xlsx, .xls or .csv"
            : "";
    },

    zipFile: (v) =>
        v && !v.name?.toLowerCase().endsWith(".zip")
            ? "Zip file must be a .zip archive"
            : "",

    cardPhoto: (v) => {
        if (!v) return "Card photo is required";
        // Allow data-URL strings, URLs, filenames or File objects
        if (typeof v === 'string') {
            if (
                v.startsWith('data:image/') ||
                v.startsWith('http') ||
                v.startsWith('/') ||
                /\.(jpe?g|png|gif)$/i.test(v)
            ) return "";
            return "Card photo must be an image";
        }
        if (!v.type?.startsWith("image/"))
            return "Card photo must be an image";
        return "";
    },

    quantity: (v) =>
        !v || Number(v) <= 0
            ? "Quantity must be a positive number"
            : "",

    to: (v) =>
        !v || !v.trim()
            ? "Recipient address is required"
            : "",

    pinCode: (v) =>
        !/^\d{6}$/.test(v)
            ? "Pin code must be 6 digits"
            : "",

    mobile: (v) =>
        !/^\d{10}$/.test(v)
            ? "Mobile number must be 10 digits"
            : "",

    customCardType: (v, cardType) =>
        cardType === "Others" && (!v || !v.trim())
            ? "Custom card type is required when Others is selected"
            : "",

    email: (v) => {
        if (!v || !v.trim()) return "Email is required";
        const re = /^\S+@\S+\.\S+$/;
        if (!re.test(v)) return "Please enter a valid email address";
        return "";
    },

    // New validators for user
    firstName: (v) =>
        !v || !v.trim() ? "First name is required" : "",

    lastName: (v) =>
        !v || !v.trim() ? "Last name is required" : "",

    username: (v) =>
        !v || !v.trim() ? "Username is required" : "",

    // For vendor
    vendorName: (v) =>
        !v || !v.trim() ? "Vendor name is required" : "",

    // For pricing
    quantityFrom: (v) =>
        !v || isNaN(Number(v)) || Number(v) <= 0
            ? "Quantity from must be a positive number"
            : "",

    quantityTo: (v) =>
        !v || isNaN(Number(v)) || Number(v) <= 0
            ? "Quantity to must be a positive number"
            : "",

    price: (v) =>
        !v || isNaN(Number(v)) || Number(v) <= 0
            ? "Price must be a positive number"
            : "",

    notes: (v) =>
        v && v.length > 50 ? "Notes must be 50 characters or less" : "",
};

// ================= SINGLE FIELD VALIDATION =================
export const validateOrderField = (field, value, cardType) => {
    if (field === 'customCardType') {
        return validators[field] ? validators[field](value, cardType) : "";
    }
    return validators[field] ? validators[field](value) : "";
};

// ================= FULL FORM VALIDATION =================
export const validateOrder = (order) => {
    const errors = {};

    // Only validate fields relevant to orders
    const orderFields = ['designName', 'excelFiles', 'zipFile', 'cardPhoto', 'quantity', 'to', 'pinCode', 'mobile'];

    orderFields.forEach((field) => {
        // excelFiles/zipFile are only required/validated when dataType is 'Variable'
        if ((field === 'excelFiles' || field === 'zipFile') && order?.dataType !== 'Variable') return;

        const error = validators[field] ? validators[field](order[field]) : "";
        if (error) errors[field] = error;
    });

    return errors;
};

// ================= USER VALIDATION =================
export const validateUser = (user) => {
    const errors = {};
    const userFields = ['firstName', 'lastName', 'username', 'email', 'mobile'];
    userFields.forEach((field) => {
        const error = validators[field](user[field]);
        if (error) errors[field] = error;
    });
    if (user.password !== undefined) {
        const p = validatePassword(user.password);
        if (p) errors.password = p;
    }
    return errors;
};

// ================= VENDOR VALIDATION =================
export const validateVendor = (vendor) => {
    const errors = {};
    const vendorFields = ['vendorName', 'email', 'mobile'];
    vendorFields.forEach((field) => {
        const error = validators[field](vendor[field]);
        if (error) errors[field] = error;
    });
    return errors;
};

// ================= PRICING VALIDATION =================
export const validatePricing = (pricing) => {
    const errors = {};
    const pricingFields = ['quantityFrom', 'quantityTo', 'price', 'notes'];
    pricingFields.forEach((field) => {
        const error = validators[field](pricing[field]);
        if (error) errors[field] = error;
    });
    return errors;
};
