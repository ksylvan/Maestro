/**
 * Pure DOM helper: build a `Range` at a character offset inside a rendered
 * Fast-tier block.
 *
 * Why this lives in its own module:
 *   The Fast tier's `scrollToMatch` needs to land the viewport on the matched
 *   word, not just the matched block. Once Virtuoso mounts the block we know
 *   the block element + the within-block character offset of the match (from
 *   `SearchHit.offsetWithinBlock`). Walking the block's text nodes to convert
 *   that offset into a DOM `Range` is a pure DOM operation — extracted here
 *   so the component test file can stub Virtuoso and exercise this logic
 *   independently.
 *
 * No React, no Virtuoso, no Fast-tier internals — just standard DOM APIs.
 */

/**
 * Walk text nodes inside `blockEl` to build a `Range` that spans `length`
 * characters starting at `offsetWithinBlock`. Handles matches that cross
 * inline element boundaries (rare but valid — e.g. a search query that spans
 * a `<strong>` boundary).
 *
 * Returns `null` when the offset is past the end of the block's text content,
 * which happens when the search engine and the DOM diverge (e.g. a sanitizer
 * stripped some content). Callers should treat null as "no precise target,
 * fall back to block-level scroll".
 */
export function buildRangeAtOffset(
	blockEl: HTMLElement,
	offsetWithinBlock: number,
	length: number
): Range | null {
	if (offsetWithinBlock < 0 || length < 0) return null;
	const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
	let consumed = 0;
	let node: Node | null;
	while ((node = walker.nextNode())) {
		const textNode = node as Text;
		const nodeLen = (textNode.textContent ?? '').length;
		if (consumed + nodeLen > offsetWithinBlock) {
			const startOffsetInNode = offsetWithinBlock - consumed;
			const range = document.createRange();
			range.setStart(textNode, startOffsetInNode);

			// Match fits in the start node — single-node range, done.
			if (startOffsetInNode + length <= nodeLen) {
				range.setEnd(textNode, startOffsetInNode + length);
				return range;
			}

			// Multi-node range: keep walking until we've consumed `length` more
			// characters from where the start node ended.
			let remaining = length - (nodeLen - startOffsetInNode);
			while ((node = walker.nextNode())) {
				const nextNode = node as Text;
				const nextLen = (nextNode.textContent ?? '').length;
				if (nextLen >= remaining) {
					range.setEnd(nextNode, remaining);
					return range;
				}
				remaining -= nextLen;
			}

			// Ran out of text before satisfying `length` — clamp end to the
			// last node end. Caller still gets a usable range starting at the
			// right position for scroll purposes.
			range.setEnd(textNode, nodeLen);
			return range;
		}
		consumed += nodeLen;
	}
	return null;
}

/**
 * Scroll the nearest ancestor of `range.startContainer` into view if needed,
 * so the matched word becomes visible. Uses `scrollIntoView({ block: 'nearest' })`
 * which is a no-op when the element is already visible — that keeps the
 * higher-level virtualizer scroll (Virtuoso `scrollToIndex`) from being
 * disturbed when the match is already centered.
 *
 * Returns true when a scroll target was found, false otherwise.
 */
export function scrollRangeIntoView(range: Range | null): boolean {
	if (!range) return false;
	const startNode = range.startContainer;
	const targetEl =
		startNode.nodeType === Node.TEXT_NODE
			? (startNode as Text).parentElement
			: (startNode as Element);
	if (!targetEl) return false;
	targetEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
	return true;
}
