("use strict");

var chrome = window.chrome || {};
chrome.storage = chrome.storage || {
	sync: {
			get: () => {},
			set: () => {}
		}
};

window.addEventListener("load", () => {
	const storage = chrome.storage.sync;
	var conduction = "100 * (likes + 1.5 * reposts + 2 * comments ) / views";
	var max_posts = 100;
	var max_period = 60;

	var conduction_inp = document.querySelector("#FORML");
	var count_inp = document.querySelector("#POSTS");
	var period_inp = document.querySelector("#period");

	storage.get(["FORMULA", "POSTS", "PERIOD"], it => {
		conduction = it.FORMULA || conduction;
		conduction_inp.value = conduction;

		max_posts = it.POSTS || max_posts;
		count_inp.value = max_posts;

		max_period = it.PERIOD || max_period;
		period_inp.value = max_period;
	});

	document.querySelector("#BUTTON").addEventListener("click", () => {
		conduction = conduction_inp.value || conduction;
		max_posts = count_inp.value || max_posts;
		max_period = period_inp.value || max_period;

		storage.set({ FORMULA: conduction, POSTS: max_posts, PERIOD: max_period });
	});

	document.querySelector(".toggle-group > #cbx").addEventListener("change",  function(e) {
		if(this.checked) {
			document.querySelector("div.settings").classList.remove("disabled");
		} else {
			document.querySelector("div.settings").classList.add("disabled");
		}
	});
});
