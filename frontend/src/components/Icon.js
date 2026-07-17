import * as LucideIcons from 'lucide-react';

/**
 * Optional convenience wrapper around Lucide icons.
 *
 * Prefer named imports when you know the icon at build time:
 *   import { Heart } from 'lucide-react';
 *   <Heart size={20} />
 *
 * Use this component when the icon name comes from CMS/config data:
 *   <Icon name="Heart" size={20} label="Favorite" />
 */
export default function Icon({
	name,
	size = 24,
	strokeWidth = 2,
	color = 'currentColor',
	label,
	className,
	...props
}) {
	const Component = LucideIcons[name];

	if (!Component) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn(`[Icon] Unknown Lucide icon: "${name}"`);
		}
		return null;
	}

	const a11y = label
		? { role: 'img', 'aria-label': label }
		: { 'aria-hidden': true, focusable: false };

	return (
		<Component
			size={size}
			strokeWidth={strokeWidth}
			color={color}
			className={className}
			{...a11y}
			{...props}
		/>
	);
}
