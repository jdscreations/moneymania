import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./auth-client";

/** Open one of the website's legal pages in an in-app browser. */
export const openLegal = (path: "/privacy" | "/terms" | "/delete-account") => WebBrowser.openBrowserAsync(`${API_URL}${path}`);
