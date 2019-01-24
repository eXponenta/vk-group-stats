window.onload=function(){
	
	var storage = chrome.storage.sync;	
	var FORMUL;
	var POSTS_C;
	var forml_inp=document.getElementById('FORML');
	var count_inp=document.getElementById('POSTS');
	var but = document.getElementById('BUTTON');
	
	storage.get("FORMULA",function(it){FORMUL=it.FORMULA; forml_inp.value=FORMUL;});
	storage.get("POSTS",function(it){POSTS_C=it.POSTS;count_inp.value=POSTS_C;});	
	
	but.addEventListener('click', function() {
        storage.set({"FORMULA" : forml_inp.value}, function() {});
        storage.set({"POSTS" : count_inp.value}, function() {});
    });
}