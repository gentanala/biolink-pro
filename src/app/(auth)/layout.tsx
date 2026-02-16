import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login - GenHub",
    description: "Masuk ke akun GenHub Anda",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}
