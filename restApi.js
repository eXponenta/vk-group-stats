function Wrapper(methodName) {
  const name = methodName;
  return function(...args) {
	//console.log("Wrap call:", methodName, args);
    return new Promise((res, rej) => {
      chrome.runtime.sendMessage({ methodName: name, args }, result => {
        if (result && result.error) {
          rej(result.error);
        }
        res(result);
      });
    });
  };
}

var VKREST = {
  Init: Wrapper("Init"),
  wall: {
    get: Wrapper("wall.get")
  },
  groups: {
    getById: Wrapper("groups.getById"),
    getMembers: Wrapper("groups.getMembers")
  }
};
