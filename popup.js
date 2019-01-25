var chrome = window.chrome || {};
window.addEventListener("load", () => {
	const storage = chrome.storage.sync;
	var conduction = "100 * (likes + 1.5 * reposts + 2 * comments ) / views";
	var max_posts = 100;

	var conduction_inp = document.getElementById("FORML");
	var count_inp = document.getElementById("POSTS");

	storage.get(["FORMULA"], it => {
		conduction = it.FORMULA || conduction;
		conduction_inp.value = conduction;
	});

	storage.get(["POSTS"], it => {
		max_posts = it.POSTS || max_posts;
		count_inp.value = max_posts;
	});

	document.querySelector("#BUTTON").addEventListener("click", () => {
		conduction = conduction_inp.value || conduction;
		max_posts = count_inp.value || max_posts;

		storage.set({ FORMULA: conduction }, function() {});
		storage.set({ POSTS: max_posts }, function() {});
	});
});
