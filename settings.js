const SETTINGS = (function() {
	const Tokens = [
		"58eb554658eb554658eb5546d8588cada5558eb58eb554604dc66e3469d0acc0894a5fb"
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
