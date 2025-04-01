import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global title
document.title = "PolicyHub - Manage your policies with AI";

createRoot(document.getElementById("root")!).render(<App />);
