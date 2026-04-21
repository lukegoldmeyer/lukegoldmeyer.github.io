/** Site copy — edit to personalize your portfolio. */
export const site = {
	name: 'Luke Goldmeyer',
	role: 'I do cool stuff.',
	tagline:
		'I am an engineering student, developer, photographer, musician, and cyclist. I love building things, solving problems, and capturing moments with photography.',
	bio: `I am an engineering student, developer, photographer, musician, and cyclist. I love building things, solving problems, and capturing moments with photography.
I am a student at the Texas A&M College of Engineering, Fightin' Texas Aggie class of 2029. I enjoy creating and building, and I am always working on something. See my project blog posts!

Photography and videography are two of my favorite creative outlets. I enjoy capturing the mundane and making it look beautiful, and I enjoy capturing the beautiful and making it look breathtaking.

Music is an irreplacible part of my life, from piano performance to just listening. Find me on Apple Music.

I don't want to rot indoors, so I like to get out. Cycling is my weapon of choice. I ride road and mountain, but I usually prefer the latter. I enjoyed my time working at Velo Republic Bikes for a year or so, and I am thankful to have been a part of the NTX NICA cross country MTB team.

This site serves to present my work, in both project blogs and photography showcases. Please send me a message if you have any questions or want to collaborate.`,
	location: 'Texas, USA',
	email: 'goldmeyerluke@gmail.com',
	phone: '972-837-9912',
	instagram: 'https://instagram.com/lukegoldmeyer.arw',
	linkedin: 'https://linkedin.com/in/lukegoldmeyer',
	github: 'https://github.com/lukegoldmeyer',

	/** Portrait for the About section — place the file in `public/` (e.g. `public/portrait.jpg`). */
	portraitSrc: '/portrait.jpg',
	portraitAlt: 'Luke Goldmeyer',

	/** Home #work section — dvdrod-style kicker + display title */
	workIntro: "What's New",
	workSectionTitle: 'Recent Projects ',
	projectsIntro: 'Projects',
	photoIntro: 'Photography',

	nav: [
		{ href: '/', label: 'Home' },
		{ href: '/projects', label: 'Projects' },
		{ href: '/photo', label: 'Photo' },
		{ href: '/#about', label: 'About' },
		{ href: '/#contact', label: 'Social' },
	],

	skills: [
		'Photography',
		'Cinematography',
		'Cycling',
		'Building',
		'Problem Solving',
		'Research',
		'Design',
		'Engineering',
		'Web Development',
		'CAD',
		'3D Printing',
		'Video Editing',
		'FPV',
		'3D Modeling',
		'Electronics',
		'UAS',
		'High Power Rocketry',
		'Automotive',
	],

	/**
	 * Work experience for the About section. Edit freely.
	 * `role` = what you did, `org` = company / org, `period` = e.g. "2023 - Present".
	 */
	experience: [
		{ role: 'Engineering Student', org: 'Texas A&M College of Engineering', period: '2025 - 2029' },
		{ role: 'Freelance Cinematographer', org: 'Self-Employed', period: '2024 - present' },
		{ role: 'Sales & Service', org: 'Velo Republic Bikes', period: '2024 - present' },
		{ role: 'XC MTB Racing', org: 'NTX NICA Cross-Country MTB Team', period: '2022 - 2025' },
		{ role: 'FPV Pilot', org: 'Professional + Hobby', period: '2022 - present' },
		// { role: 'Role', org: 'Organization', period: '20XX - 20XX' },
		// { role: 'Role', org: 'Organization', period: '20XX - 20XX' },
		// { role: 'Role', org: 'Organization', period: '20XX - 20XX' },
	] as Array<{ role: string; org: string; period: string }>,

	/**
	 * Tags that should NOT produce a Topics section on /projects. Posts with only
	 * hidden tags will still appear in Recent / Pinned / All, just not in Topics.
	 * Matching is case-insensitive.
	 */
	hiddenTopics: ['Pipeline'],

	/**
	 * Topics section ordering on the /projects page.
	 * Tags listed here appear first, in this order. Any other tags fall after these, alphabetized.
	 * Tag matching is case-insensitive.
	 */
	tagOrder: [
		'Photography',
		'Cinematography',
		'Web Development',
		'Engineering',
		'CAD',
		'3D Printing',
		'Electronics',
		'Cycling',
		'FPV',
		'UAS',
		'High Power Rocketry',
	],
} as const;
