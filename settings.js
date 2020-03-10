const SETTINGS = (function() {
	const Tokens = [
		"e0edd766e0edd766e0edd76658e08a2f85ee0ede0edd766be8b7e1a95ff8266d8abb77e",
		"1306bb541306bb541306bb54d713768b2d113061306bb544d619b6a6ca223065cb69c72"
	];

	const now = new Date();

	let onChanged = e => {};


	let params = {
		ENABLED: true,
		POSTS: 100,
		//PERIOD: 60,
		IGNORE_ADS: true,
		IGNORE_PINNED: false,
		FORMULA: "100 * (likes + 1.5 * reposts + 2 * comments ) / views",
		FROM : new Date(new Date(now).setMonth(now.getMonth() - 1)),
		TO: now
	};

	function Init() {
		chrome.storage.onChanged.addListener(changed);

		const names = Object.getOwnPropertyNames(params);
		chrome.storage.sync.get(names, changed);
	}

	function changed(e) {
		for (let key in e) {
			if (params[key] != undefined) {
				params[key] = e[key].newValue != undefined ? e[key].newValue : e[key];
			}
		}

		if (typeof onChanged === "function") {
			onChanged(params);
		}
	}

	return {
		Tokens,
		Init,
		get onChanged() {
			return onChanged;
		},
		set onChanged(func) {
			onChanged = func;
		},
		params
	};
})();
