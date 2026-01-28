export const getImageUrl = (filename) => {
    if (!filename) return null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    return `${baseUrl}/uploads/${filename}`;
}