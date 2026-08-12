/**
 * Asymmetric hover arrow for `.kpf-link`:
 * enter = fade/slide from left · leave = fade/slide to right · then reset.
 * CSS keyframes live in foundation.css / components.css.
 */
const ARROW_ATTR = "data-kpf-arrow";

function bindLink(link) {
	if (!(link instanceof HTMLElement)) return;
	if (link.getAttribute(ARROW_ATTR) === "1") return;
	if (link.classList.contains("kpf-btn")) return;
	link.setAttribute(ARROW_ATTR, "1");

	const onEnter = () => {
		link.classList.remove("is-arrow-out");
		link.classList.add("is-arrow-in");
	};

	const onLeave = () => {
		// Atomic swap so we never fall through to the idle “left” pose mid-fade.
		if (!link.classList.contains("is-arrow-in")) return;
		link.classList.replace("is-arrow-in", "is-arrow-out");
	};

	const onAnimEnd = (event) => {
		if (event.animationName !== "kpf-link-arrow-out") return;
		link.classList.remove("is-arrow-out");
	};

	link.addEventListener("pointerenter", onEnter);
	link.addEventListener("pointerleave", onLeave);
	link.addEventListener("focus", onEnter);
	link.addEventListener("blur", onLeave);
	link.addEventListener("animationend", onAnimEnd);
}

export function bindKpfLinkArrows(root = document) {
	if (typeof document === "undefined") return;
	const scope = root?.querySelectorAll ? root : document;
	scope.querySelectorAll(".kpf-link").forEach(bindLink);
}

export function observeKpfLinkArrows() {
	if (typeof document === "undefined") return () => {};

	bindKpfLinkArrows(document);

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			mutation.addedNodes.forEach((node) => {
				if (!(node instanceof HTMLElement)) return;
				if (node.matches?.(".kpf-link")) bindLink(node);
				node.querySelectorAll?.(".kpf-link").forEach(bindLink);
			});
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
	return () => observer.disconnect();
}
