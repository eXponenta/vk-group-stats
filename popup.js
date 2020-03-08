("use strict");

var chrome = window.chrome || {};
chrome.storage = chrome.storage || {
	sync: {
		get: () => {},
		set: () => {}
	}
};

const dc = document.querySelector.bind(document);

Date.prototype.daysTo = function (date) {
	return Math.floor(Math.abs(this - date) / (1000 * 60 * 60 * 24)); 
}

Date.prototype.inputDate = function() {
	return this.toISOString().substring(0, 10);
}

window.addEventListener("load", () => {
	const storage = chrome.storage.sync;
	var conduction = "100 * (likes + 1.5 * reposts + 2 * comments ) / views";
	var max_posts = 100;

	const now = new Date();

	var date_from =  new Date(new Date(now).setMonth(now.getMonth() - 1));
	var date_to = now;
	
	var max_period = date_from.daysTo(date_to);

	const conduction_inp = dc("#FORML");
	const count_inp = dc("#POSTS");
	const from_inp = dc("#period-from");
	const to_inp = dc("#period-to");
	const period_text = dc("#period-time");
	const settings_view = dc("div.settings");

	period_text.textContent = max_period;
	to_inp.value = date_to.inputDate();
	from_inp.value = date_from.inputDate();

	to_inp.max = from_inp.max = date_to.inputDate();
	
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

		storage.set({ 
			FORMULA: conduction, 
			POSTS: max_posts, 
			FROM:  date_from.toISOString(),
			TO: date_to.toISOString()
		});
	});

	function dateUpdate(e) {		
		if(this === to_inp){
			date_to = new Date(this.value);
			from_inp.max = date_to.inputDate();

		} else {
			date_from = new Date(this.value);
		}

		max_period = date_from.daysTo(date_to);
		period_text.textContent = max_period;
	}

	to_inp.addEventListener("change", dateUpdate);
	from_inp.addEventListener("change", dateUpdate);

	toogle_inp.addEventListener("change", function(e) {
		settings_view.setEnabled(this.checked);
		storage.set({ ENABLED: !!this.checked });
	});

	storage.get(["FORMULA", "POSTS", "FROM","TO", "ENABLED"], it => {
		conduction = it.FORMULA || conduction;
		conduction_inp.value = conduction;

		max_posts = it.POSTS || max_posts;
		count_inp.value = max_posts;

		date_to = new Date(it.TO || date_to);
		to_inp.value = date_to.inputDate();

		date_from = new Date(it.FROM || date_from);
		from_inp.value = date_from.inputDate();
				
		from_inp.max = date_to.inputDate();
	
		max_period = date_from.daysTo(date_to);

		period_text.textContent = max_period;
		//max_period = it.PERIOD || max_period;
		//period_inp.value = max_period;

		toogle_inp.checked = it.ENABLED;
		settings_view.setEnabled(it.ENABLED);
	});
});
