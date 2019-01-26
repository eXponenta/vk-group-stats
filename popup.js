("use strict");

var chrome = window.chrome || {};
chrome.storage = chrome.storage || {
	sync: {
		get: () => {},
		set: () => {}
	}
};

const dc = document.querySelector.bind(document);

window.addEventListener("load", () => {
	const storage = chrome.storage.sync;
	var conduction = "100 * (likes + 1.5 * reposts + 2 * comments ) / views";
	var max_posts = 100;
	var max_period = 60;

	const conduction_inp = dc("#FORML");
	const count_inp = dc("#POSTS");
	const period_inp = dc("#period");
	const settings_view = dc("div.settings");

	settings_view.setEnabled = function(state) {
		if (state) {
			this.classList.remove("disabled");
		} else {
			this.classList.add("disabled");
		}
	};

	const toogle_inp = dc(".toggle-group > #cbx");

	dc("#BUTTON").addEventListener("click", () => {
		conduction = conduction_inp.value || conduction;
		max_posts = count_inp.value || max_posts;
		max_period = period_inp.value || max_period;

		storage.set({ FORMULA: conduction, POSTS: max_posts, PERIOD: max_period });
	});

	toogle_inp.addEventListener("change", function(e) {
		settings_view.setEnabled(this.checked);
		storage.set({ ENABLED: !!this.checked });
	});

	storage.get(["FORMULA", "POSTS", "PERIOD", "ENABLED"], it => {
		conduction = it.FORMULA || conduction;
		conduction_inp.value = conduction;

		max_posts = it.POSTS || max_posts;
		count_inp.value = max_posts;

		max_period = it.PERIOD || max_period;
		period_inp.value = max_period;

		toogle_inp.checked = it.ENABLED;
		settings_view.setEnabled(it.ENABLED);
	});
});
