const SETTINGS = (function() {
	const Tokens = [
		"06740f3006740f3006740f30d0061c49af0067406740f305a3f5141aecd2b7cbab35b32",
		"105b2545105b2545105b25456a103363e01105b105b25454c107a7d114e205f4f8c4f79",
		"4b203d364b203d364b203d36dc4b487b9044b204b203d36176b6261da194e5415beb80d",
		"58eb554658eb554658eb5546d8588cada5558eb58eb554604dc66e3469d0acc0894a5fb",
		"965f1d25965f1d25965f1d250096375b8b9965f965f1d25ca147d7690032d953aa64239",
		"b944403bb944403bb944403b32b92c0694bb944b944403be50f204c08cd4fb3b10e22a9",
		"1c3bb4521c3bb4521c3bb452a01c53f2e311c3b1c3bb4524070d4c49518055ccc95d3cd",
		"3d1c1b293d1c1b293d1c1b29493d745d9a33d1c3d1c1b2961577bf581d885342e8cb339",
		"9bb8dffb9bb8dffb9bb8dffbb89bd0994f99bb89bb8dffbc7f3bf014d09340533e579f2",
		"c1767e21c1767e21c1767e219cc11e3894cc176c1767e219d3d1f3db3195cb7f66c5005",
		"e046251de046251de046251dc0e02e63abee046e046251dbc0d4443f84c5e696c0674d8",
		"8bdcb4068bdcb4068bdcb4062a8bb4f2be88bdc8bdcb406d797d58ee5333cbd7ab2fd90",
		"3002050430020504300205047f306a43bd33002300205046c4964a026f25f49776d19ac",
		"c1427e6cc1427e6cc1427e6ce7c12a5206cc142c1427e6c9d06adf1f9e9610efd4a995b",
		"3dccbb243dccbb243dccbb24603dacfa5d33dcc3dccbb2467f10fc843946f2bc43c772c",
		"be2f513dbe2f513dbe2f513d3bbe7189eebbe2fbe2f513de7f21ba46d8849d2c0f03dbd"
	];

	let onChanged = e => {};

	let params = {
		ENABLED: true,
		POSTS: 100,
		PERIOD: 60,
		IGNORE_ADS: true,
		IGNORE_PINNED: false,
		FORMULA: "100 * (likes + 1.5 * reposts + 2 * comments ) / views"
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
