import { useEffect } from "react";
import { observeKpfLinkArrows } from "@/lib/linkArrows";

/**
 * Binds asymmetric hover arrows on `.kpf-link` (enter left / exit right).
 */
export default function LinkArrowRuntime() {
	useEffect(() => observeKpfLinkArrows(), []);
	return null;
}
