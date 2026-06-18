import { useEffect, useRef, useState } from 'react';

export function useElapsedGenerationTime(isGenerating: boolean, startedAt?: number): number {
	const fallbackStartRef = useRef<number>(Date.now());
	const startTime = startedAt ?? fallbackStartRef.current;
	const [elapsedMs, setElapsedMs] = useState(() => Math.max(0, Date.now() - startTime));

	useEffect(() => {
		if (!isGenerating) return;

		setElapsedMs(Math.max(0, Date.now() - startTime));

		const interval = setInterval(() => {
			setElapsedMs(Math.max(0, Date.now() - startTime));
		}, 1000);

		return () => clearInterval(interval);
	}, [isGenerating, startTime]);

	return elapsedMs;
}
