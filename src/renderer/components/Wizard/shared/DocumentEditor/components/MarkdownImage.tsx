import { useEffect, useState } from 'react';
import { Spinner } from '../../../../ui/Spinner';
import type { Theme } from '../../../../../types';

interface MarkdownImageProps {
	src?: string;
	alt?: string;
	folderPath?: string;
	theme: Theme;
}

export function MarkdownImage({
	src,
	alt,
	folderPath,
	theme,
}: MarkdownImageProps): JSX.Element | null {
	const [dataUrl, setDataUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!src) {
			setLoading(false);
			return;
		}

		if (src.startsWith('images/') && folderPath) {
			const absolutePath = `${folderPath}/${src}`;
			window.maestro.fs
				.readFile(absolutePath)
				.then((result) => {
					if (result && result.startsWith('data:')) {
						setDataUrl(result);
					} else {
						setError('Invalid image data');
					}
					setLoading(false);
				})
				.catch((err: Error) => {
					setError(`Failed to load: ${err.message}`);
					setLoading(false);
				});
		} else if (src.startsWith('data:') || src.startsWith('http')) {
			setDataUrl(src);
			setLoading(false);
		} else {
			setLoading(false);
		}
	}, [src, folderPath]);

	if (loading) {
		return (
			<span
				className="inline-flex items-center gap-2 px-3 py-2 rounded"
				style={{ backgroundColor: theme.colors.bgActivity }}
			>
				<Spinner size={16} color={theme.colors.textDim} />
				<span className="text-xs" style={{ color: theme.colors.textDim }}>
					Loading...
				</span>
			</span>
		);
	}

	if (error || !dataUrl) {
		return null;
	}

	return (
		<img
			src={dataUrl}
			alt={alt || ''}
			className="rounded border my-2"
			style={{
				maxHeight: '200px',
				maxWidth: '100%',
				objectFit: 'contain',
				borderColor: theme.colors.border,
			}}
		/>
	);
}
