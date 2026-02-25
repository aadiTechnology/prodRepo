import React from "react";
import { Box, Typography, Link, Container } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

/**
 * SessionExpired Page
 * Displayed when user's session expires or times out due to inactivity.
 * Matches the user-provided "Aadi Technology" unique cool design reference.
 */
const SessionExpired: React.FC = () => {
    // Use the logo from the public folder
    const logoPath = "/aadi-logo.png";
    return (
        <Box
            sx={{
                backgroundColor: "#ffffff",
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Container maxWidth="md">
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        gap: 6,
                    }}
                >
                    {/* Main Expiration Message */}
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            color: "#334e68",
                            fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
                            maxWidth: "800px",
                            lineHeight: 1.4,
                        }}
                    >
                        Your session has expired. Please{" "}
                        <Link
                            component={RouterLink}
                            to="/login"
                            sx={{
                                color: "#2196f3", // Blue color like in reference
                                textDecoration: "none",
                                borderBottom: "2px solid #2196f3",
                                pb: 0.5,
                                fontWeight: 700,
                                transition: "all 0.2s",
                                "&:hover": {
                                    color: "#1976d2",
                                    borderBottomColor: "#1976d2",
                                },
                            }}
                        >
                            click here
                        </Link>{" "}
                        to reconnect to the portal.
                    </Typography>

                    {/* Logo and Branding Section */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                        }}
                    >
                        <Box
                            component="img"
                            src={logoPath}
                            alt="Aadi Technology Logo"
                            sx={{
                                width: { xs: "200px", md: "250px" },
                                height: "auto",
                                filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.1))",
                            }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                // If logo fails to load (missing file), show a generic placeholder icon or initials
                                e.currentTarget.style.display = "none";
                            }}
                        />
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                color: "#38b2ac", // Teal/Cyan color from logo
                                fontSize: { xs: "1.8rem", md: "2.5rem" },
                                letterSpacing: "-0.01em",
                            }}
                        >
                            Aadi Technology
                        </Typography>
                    </Box>

                    {/* Footer Section */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: "100%",
                            mt: 2,
                        }}
                    >
                        <Box
                            sx={{
                                width: "120px",
                                height: "1px",
                                backgroundColor: "#ff5252", // Red line as in reference
                                mb: 2,
                            }}
                        />
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontWeight: 700,
                                color: "#4a5568",
                                fontSize: "1rem",
                                mb: 0.5,
                            }}
                        >
                            Information Technologies
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: "#a0aec0",
                                fontSize: "0.85rem",
                            }}
                        >
                            All rights reserved &copy; 2007 - 2026, Aaditi Technology.
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};

export default SessionExpired;
