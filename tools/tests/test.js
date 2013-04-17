module("General");
test("Using extension domain", 1, function() {
  ok(window.chrome && chrome.extension, "This test suite should be running on an extension URL");
});

module("Parsing URLs: parseURI");
test("parseUri", 17, function() {
  deepEqual(parseUri("https://foo.bar/"), {"hash": "", "host": "foo.bar", "hostname": "foo.bar", "href": "https://foo.bar/", "origin": "https://foo.bar", "pathname": "/", "port": "", "protocol": "https:", "search": ""});
  deepEqual(parseUri("https://foo.bar:80/"), {"hash": "", "host": "foo.bar:80", "hostname": "foo.bar", "href": "https://foo.bar:80/", "origin": "https://foo.bar:80", "pathname": "/", "port": "80", "protocol": "https:", "search": ""});
  deepEqual(parseUri("https://foo.bar/?http://www.google.nl/search?"), {"hash": "", "host": "foo.bar", "hostname": "foo.bar", "href": "https://foo.bar/?http://www.google.nl/search?", "origin": "https://foo.bar", "pathname": "/", "port": "", "protocol": "https:", "search": "?http://www.google.nl/search?"});
  deepEqual(parseUri("https:foo.bar/?http://www.google.nl/search?"), {"hash": "", "host": "foo.bar", "hostname": "foo.bar", "href": "https:foo.bar/?http://www.google.nl/search?", "origin": "https:foo.bar", "pathname": "/", "port": "", "protocol": "https:", "search": "?http://www.google.nl/search?"});
  deepEqual(parseUri("http://usr:@www.test.com:81/dir/dir.2/index.htm?q1=0&&test1&test2=value#top"), {"hash": "#top", "host": "www.test.com:81", "hostname": "www.test.com", "href": "http://usr:@www.test.com:81/dir/dir.2/index.htm?q1=0&&test1&test2=value#top", "origin": "http://usr:@www.test.com:81", "pathname": "/dir/dir.2/index.htm", "port": "81", "protocol": "http:", "search": "?q1=0&&test1&test2=value"});
  deepEqual(parseUri("http://usr:pass@www.test.com:81/dir/dir.2/index.htm?q1=0&&test1&test2=value#top"), {"hash": "#top", "host": "www.test.com:81", "hostname": "www.test.com", "href": "http://usr:pass@www.test.com:81/dir/dir.2/index.htm?q1=0&&test1&test2=value#top", "origin": "http://usr:pass@www.test.com:81", "pathname": "/dir/dir.2/index.htm", "port": "81", "protocol": "http:", "search": "?q1=0&&test1&test2=value"});
  deepEqual(parseUri("http://usr:pass@www.test.com/dir/dir.2/index.htm?q1=0&&test1&test2=value#top"), {"hash": "#top", "host": "www.test.com", "hostname": "www.test.com", "href": "http://usr:pass@www.test.com/dir/dir.2/index.htm?q1=0&&test1&test2=value#top", "origin": "http://usr:pass@www.test.com", "pathname": "/dir/dir.2/index.htm", "port": "", "protocol": "http:", "search": "?q1=0&&test1&test2=value"});
  deepEqual(parseUri("http://www.test.com/dir/dir.2/index.htm?q1=0&&test1&test2=value#top"), {"hash": "#top", "host": "www.test.com", "hostname": "www.test.com", "href": "http://www.test.com/dir/dir.2/index.htm?q1=0&&test1&test2=value#top", "origin": "http://www.test.com", "pathname": "/dir/dir.2/index.htm", "port": "", "protocol": "http:", "search": "?q1=0&&test1&test2=value"});
  deepEqual(parseUri("http://www.test.com/dir/dir@2/index.htm#top"), {"hash": "#top", "host": "www.test.com", "hostname": "www.test.com", "href": "http://www.test.com/dir/dir@2/index.htm#top", "origin": "http://www.test.com", "pathname": "/dir/dir@2/index.htm", "port": "", "protocol": "http:", "search": ""});
  deepEqual(parseUri("http://www.test.com/dir/dir@2/index#top"), {"hash": "#top", "host": "www.test.com", "hostname": "www.test.com", "href": "http://www.test.com/dir/dir@2/index#top", "origin": "http://www.test.com", "pathname": "/dir/dir@2/index", "port": "", "protocol": "http:", "search": ""});
  deepEqual(parseUri("http://test.com/dir/dir@2/#top"), {"hash": "#top", "host": "test.com", "hostname": "test.com", "href": "http://test.com/dir/dir@2/#top", "origin": "http://test.com", "pathname": "/dir/dir@2/", "port": "", "protocol": "http:", "search": ""});
  deepEqual(parseUri("http://www.test.com/dir/dir@2/?top"), {"hash": "", "host": "www.test.com", "hostname": "www.test.com", "href": "http://www.test.com/dir/dir@2/?top", "origin": "http://www.test.com", "pathname": "/dir/dir@2/", "port": "", "protocol": "http:", "search": "?top"});
  deepEqual(parseUri("http://www.test.com/dir/dir@2/"), {"hash": "", "host": "www.test.com", "hostname": "www.test.com", "href": "http://www.test.com/dir/dir@2/", "origin": "http://www.test.com", "pathname": "/dir/dir@2/", "port": "", "protocol": "http:", "search": ""});
  deepEqual(parseUri("feed:https://www.test.com/dir/dir@2/"), {"hash": "", "host": "www.test.com", "hostname": "www.test.com", "href": "feed:https://www.test.com/dir/dir@2/", "origin": "feed:https://www.test.com", "pathname": "/dir/dir@2/", "port": "", "protocol": "feed:", "search": ""});
  deepEqual(parseUri("feed:https://www.test.com:80/dir/dir@2/"), {"hash": "", "host": "www.test.com:80", "hostname": "www.test.com", "href": "feed:https://www.test.com:80/dir/dir@2/", "origin": "feed:https://www.test.com:80", "pathname": "/dir/dir@2/", "port": "80", "protocol": "feed:", "search": ""});
  deepEqual(parseUri("feed:https://www.test.com/dir/dir2/?http://foo.bar/"), {"hash": "", "host": "www.test.com", "hostname": "www.test.com", "href": "feed:https://www.test.com/dir/dir2/?http://foo.bar/", "origin": "feed:https://www.test.com", "pathname": "/dir/dir2/", "port": "", "protocol": "feed:", "search": "?http://foo.bar/"});
  deepEqual(parseUri("chrome-extension://longidentifier/tools/tests/index.html?notrycatch=true"), {"hash": "", "host": "longidentifier", "hostname": "longidentifier", "href": "chrome-extension://longidentifier/tools/tests/index.html?notrycatch=true", "origin": "chrome-extension://longidentifier", "pathname": "/tools/tests/index.html", "port": "", "protocol": "chrome-extension:", "search": "?notrycatch=true"});
});
test("parseSearch", 11, function() {
  deepEqual(parseUri.parseSearch("?hello=world&ext=adblock&time=bedtime"), {"ext": "adblock", "hello": "world", "time": "bedtime"});
  deepEqual(parseUri.parseSearch(""), {});
  deepEqual(parseUri.parseSearch("?"), {});
  deepEqual(parseUri.parseSearch("?hello"), {"hello": ""});
  deepEqual(parseUri.parseSearch("?hello=world"), {"hello": "world"});
  deepEqual(parseUri.parseSearch("?hello&ext=adblock"), {"ext": "adblock", "hello": ""});
  deepEqual(parseUri.parseSearch("?ext=adblock&hello"), {"ext": "adblock", "hello": ""});
  deepEqual(parseUri.parseSearch("?hello=world&hello=earth"), {"hello": "earth"});
  deepEqual(parseUri.parseSearch("?hello=&ext=adblock"), {"ext": "adblock", "hello": ""});
  deepEqual(parseUri.parseSearch("?hello=world&&ext=adblock"), {"ext": "adblock", "hello": "world"});
  deepEqual(parseUri.parseSearch("?hello&&&&ext=adblock"), {"ext": "adblock", "hello": ""});
});

module("DomainSet");
test("caching and immutable Filters", function() {
  var text = "safariadblock.com##div" 
  var f = Filter.fromText(text);
  strictEqual(f, Filter.fromText(text), "Caching works");
  var fCopy = JSON.parse(JSON.stringify(f));

  var f2 = SelectorFilter.merge(f, [Filter.fromText("safariadblock.com#@#div")]);
  notDeepEqual(f._domains, f2._domains);

  var fSecondCopy = JSON.parse(JSON.stringify(f));
  deepEqual(fCopy, fSecondCopy, "Filters are not mutated by SelectorFilter.merge()");

  strictEqual(f, Filter.fromText(text), "Cached filters aren't affected by subtraction");
});

test("clone", function() {
  var d = new DomainSet({"": true, "a.com": false, "b.a.com": true});
  var d2 = d.clone();
  notStrictEqual(d, d2);
  deepEqual(d, d2);
});

test("full", function() {
  ok(new DomainSet({"": true}).full());
  ok(new DomainSet({"": true, "a.com": true}).full());
  ok(!new DomainSet({"": true, "a.com": false, "b.a.com": true}).full());
  ok(!new DomainSet({"": false}).full());
  ok(!new DomainSet({"": false, "a.com": true}).full());
});

test("subtract", function() {

  var _normalize = function(data) {
    var result = {};
    for (var d in data)
      result[d === 'ALL' ? DomainSet.ALL : d] = data[d];
    return result;
  }
  // Does DomainSet(data1).subtract(DomainSet(data2)) work as expected?
  var _test = function(data1, data2, result) {
    var set1 = new DomainSet(_normalize(data1));
    set1.subtract( new DomainSet(_normalize(data2)) );
    deepEqual(set1.has, _normalize(result), JSON.stringify(data1) + ' minus ' + JSON.stringify(data2));
  }

  var T = true, F = false;
  _test({ ALL: T, }, { ALL: T }, { ALL: F });
  _test({ ALL: T, }, { ALL: F, 'a': T }, { ALL: T, 'a': F });
  _test({ ALL: F, 'a': T }, { ALL: F, 'a': T }, { ALL: F });
  _test({ ALL: F, 'a': T }, { ALL: F, 'b': T }, { ALL: F, 'a': T });
  _test({ ALL: F, 'a': T }, { ALL: F, 's.a': T }, { ALL: F, 'a': T, 's.a': F});
  _test({ ALL: F, 'a': T, 'c.b.a': F }, { ALL: F, 'b.a': T }, { ALL: F, 'a': T, 'b.a': F });
  _test({ ALL: F, 'a': T, 'd.c.b.a': F }, { ALL: F, 'b.a': T, 'c.b.a': F }, { ALL: F, 'a': T, 'b.a': F, 'c.b.a': T, 'd.c.b.a': F });
  _test({ ALL: T, 'b.a': F }, { ALL: F, 'd': T }, { ALL: T, 'd': F, 'b.a': F });
  _test({ ALL: F, 'b.a': T }, { ALL: T, 'd': F }, { ALL: F });
  _test({ ALL: T, 'b.a': F }, { ALL: T, 'a': F }, { ALL: F, 'a': T, 'b.a': F });
  _test({ ALL: F, 'b.a': T, 'd.c.b.a': F }, { ALL: F, 'a': T, 'c.b.a': F }, {ALL: F, 'c.b.a': T, 'd.c.b.a': F });
  _test({ ALL: F, 'c.b.a': T, 'd.c.b.a': F}, { ALL: F, 'a': T, 'd.a': F }, { ALL: F });
  _test({ ALL: F, 'b.a': T, 'c.b.a': F }, { ALL: F, 'd': T }, { ALL: F, 'b.a': T, 'c.b.a': F });
  _test({ ALL: T, 'b.a': F }, { ALL: F, 'a': T, 'd.a': F }, { ALL: T, 'a': F, 'd.a': T });

});

test("_computedHas", function() {
  var set1 = new DomainSet({"": false, "s.a": true});
  var set2 = new DomainSet({"": false, "a": true});
  ok(!set1._computedHas("a"), "subdomains don't imply their parents");
  ok(set2._computedHas("s.a"), "domains imply their children");
});

module("FilterNormalizer");

test("normalizeLine", function() {
  var nl = FilterNormalizer.normalizeLine;
  equal(nl("a##z"), "a##z", "Simple SelectorFilters are OK");
  equal(nl("##[style]"), "~mail.google.com,~mail.yahoo.com##[style]", "[style] bug is handled");
  equal(nl("google.com##[style]"), "~mail.google.com,google.com##[style]", "[style] bug is handled subtlely");
  raises(function() { nl("google.com####[style]"); }, "Bad SelectorFilter throws an exception");
});

test("_ensureExcluded", function() {
  var entries = [
    { text: "a##z",   domains: [],           expected: "a##z" },
    { text: "##z",    domains: [],           expected: "##z" },
    { text: "##z",    domains: ["a"],        expected: "~a##z" },
    { text: "##z",    domains: ["a", "b"],   expected: "~a,~b##z" },

    { text: "a##z",   domains: [],           expected: "a##z" },
    { text: "a##z",   domains: ["a"],        expected: "~a,a##z" },
    { text: "a##z",   domains: ["a", "b"],   expected: "~a,a##z" },

    { text: "a##z",   domains: ["s.a"],      expected: "~s.a,a##z" },
    { text: "a##z",   domains: ["s.a", "b"], expected: "~s.a,a##z" },
    { text: "a##z",   domains: ["a", "s.b"], expected: "~a,a##z" },

    { text: "s.a##z", domains: [],           expected: "s.a##z" },
    { text: "s.a##z", domains: ["b"],        expected: "s.a##z" },
    { text: "s.a##z", domains: ["a", "b"],   expected: "s.a##z" },
    { text: "s.a##z", domains: ["s.s.a"],    expected: "~s.s.a,s.a##z" },

    { text: "a,b##z", domains: ["a"],        expected: "~a,a,b##z" },
    { text: "a,b##z", domains: ["a"],        expected: "~a,a,b##z" },

    // Excluding a parent of an included child doesn't exclude the child.  This
    // is probably fine.
    { text: "mail.google.com##div[style]", domains: ["google.com"], expected: "mail.google.com##div[style]" },
    { text: "##div[style]", domains: ["mail.google.com", "mail.yahoo.com"], expected: "~mail.google.com,~mail.yahoo.com##div[style]" },
    { text: "ex.com##div[style]", domains: ["mail.google.com", "mail.yahoo.com"], expected: "ex.com##div[style]" },
    { text: "google.com##div[style]", domains: ["mail.google.com", "mail.yahoo.com"], expected: "~mail.google.com,google.com##div[style]" },
  ];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    equal(FilterNormalizer._ensureExcluded(entry.text, entry.domains), entry.expected,
          "_ensureExcluded('" + entry.text + "', ...) -> '" + entry.expected + "'");
  }
});

module("SelectorFilter");

test("merge", function() {
  var _testEmpty = function(a, b) {
    var first = SelectorFilter.merge(
      Filter.fromText(a), 
      b.map(function(text) { return Filter.fromText(text); })
    );
    var result = new DomainSet({"": false});
    deepEqual(first._domains, result, a + " - " + JSON.stringify(b) + " = nothing");
  }
  var _test = function(a, b, c) {
    var first = SelectorFilter.merge(
      Filter.fromText(a), 
      b.map(function(text) { return Filter.fromText(text); })
    );
    var second = Filter.fromText(c);
    notEqual(first.id, second.id);
    first.id = second.id;
    deepEqual(first, second, a + " - " + JSON.stringify(b) + " = " + c);
  }
  var f = [
    "a.com##div",
    "b.com##div",
    "sub.a.com##div",
    "~a.com##div",
    "##div",
  ];
  strictEqual(SelectorFilter.merge(f[0], undefined), f[0]);
  _testEmpty(f[0], [f[0]]);
  _testEmpty(f[0], [f[4]]);
  _testEmpty(f[0], [f[1], f[2], f[3], f[4]]);
  _testEmpty(f[1], [f[3]]);
  _test(f[0], [f[1]], "a.com##div");
  _test(f[0], [f[2]], "a.com,~sub.a.com##div");
  _test(f[0], [f[3]], "a.com##div");
  _test(f[0], [f[1], f[2], f[3]], "a.com,~sub.a.com##div");
  _test(f[1], [f[2]], f[1]);
});

module("MyFilters");

if (/Chrome/.test(navigator.userAgent)) {
  // CHROME ONLY
  (function() {
    module("Purging the remainders of ads using CSS selectors");
    
    function runme(page, url) {
      elementPurger._page_location = parseUri(page);
      return elementPurger._srcsFor(url);
    }
    
    test("Fragments behind URLs", 4, function() {
      deepEqual(runme("http://a.com/b/c/d.html#e", "http://a.com/b/c/d.html#f"), [
                {"op": "$=", "text": "//a.com/b/c/d.html#f"},
                {"op": "=", "text": "/b/c/d.html#f"},
                {"op": "=", "text": "d.html#f"},
                {"op": "=", "text": "./d.html#f"}]);
      deepEqual(runme("http://a.com/b/c/d.html#e/f/g", "http://a.com/b/c/d.html#a/b/c/d/e/f"), [
                {"op": "$=", "text": "//a.com/b/c/d.html#a/b/c/d/e/f"},
                {"op": "=", "text": "/b/c/d.html#a/b/c/d/e/f"},
                {"op": "=", "text": "d.html#a/b/c/d/e/f"},
                {"op": "=", "text": "./d.html#a/b/c/d/e/f"}]);
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/b/c/e.html#f"), [
                {"op": "$=", "text": "//a.com/b/c/e.html#f"},
                {"op": "=", "text": "/b/c/e.html#f"},
                {"op": "=", "text": "e.html#f"},
                {"op": "=", "text": "./e.html#f"}]);
      deepEqual(runme("http://a.com/b/c/#", "http://a.com/b/c/d/#"), [
                {"op": "$=", "text": "//a.com/b/c/d/#"},
                {"op": "=", "text": "/b/c/d/#"},
                {"op": "=", "text": "d/#"},
                {"op": "=", "text": "./d/#"}]);
    });
    
    test("Ignore queryparameters in page but not in url", 2, function() {
      deepEqual(runme("http://a.com/b/c/d.html?e/f/g/h#i/j", "http://a.com/b/c/k.html?l/m#n#o"), [
                {"op": "$=", "text": "//a.com/b/c/k.html?l/m#n#o"},
                {"op": "=", "text": "/b/c/k.html?l/m#n#o"},
                {"op": "=", "text": "k.html?l/m#n#o"},
                {"op": "=", "text": "./k.html?l/m#n#o"}]);
      deepEqual(runme("http://a.com/b/c/d.html?e/f/g/h#i/j", "http://a.com/b/c/k.html?/l/m#n#o"), [
                {"op": "$=", "text": "//a.com/b/c/k.html?/l/m#n#o"},
                {"op": "=", "text": "/b/c/k.html?/l/m#n#o"},
                {"op": "=", "text": "k.html?/l/m#n#o"},
                {"op": "=", "text": "./k.html?/l/m#n#o"}]);
    });
    
    test("Different domains", 2, function() {
      deepEqual(runme("http://a.com/b/c/d.html", "http://e.com/f.html"), [
                {"op": "$=", "text": "//e.com/f.html"}]);
      deepEqual(runme("http://a.com/b/c/d.html", "http://e.com/f.html#http://g.com/h/i/#j#k#l"), [
                {"op": "$=", "text": "//e.com/f.html#http://g.com/h/i/#j#k#l"}]);
    });
    
    test("Same directory", 2, function() {
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/b/c/d.html"), [
                {"op": "$=", "text": "//a.com/b/c/d.html"},
                {"op": "=", "text": "/b/c/d.html"},
                {"op": "=", "text": "d.html"},
                {"op": "=", "text": "./d.html"}]);
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/b/c/e.html"), [
                {"op": "$=", "text": "//a.com/b/c/e.html"},
                {"op": "=", "text": "/b/c/e.html"},
                {"op": "=", "text": "e.html"},
                {"op": "=", "text": "./e.html"}]);
    });
    
    test("Different documents in parent directories", 3, function() {
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/b/e.html"), [
                {"op": "$=", "text": "//a.com/b/e.html"},
                {"op": "=", "text": "/b/e.html"},
                {"op": "$=", "text": "../e.html"}]);
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/e.html"), [
                {"op": "$=", "text": "//a.com/e.html"},
                {"op": "=", "text": "/e.html"},
                {"op": "$=", "text": "../../e.html"}]);
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/"), [
                {"op": "$=", "text": "//a.com/"},
                {"op": "=", "text": "/"},
                {"op": "$=", "text": "../../"}]);
    });
    
    test("Different doc in subdirs of same or parent dir", 2, function() {
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/b/c/e/f/g.html"), [
                {"op": "$=", "text": "//a.com/b/c/e/f/g.html"},
                {"op": "=", "text": "/b/c/e/f/g.html"},
                {"op": "=", "text": "e/f/g.html"},
                {"op": "=", "text": "./e/f/g.html"}]);
      deepEqual(runme("http://a.com/b/c/d.html", "http://a.com/b/e/f/g.html"), [
                {"op": "$=", "text": "//a.com/b/e/f/g.html"},
                {"op": "=", "text": "/b/e/f/g.html"},
                {"op": "$=", "text": "../e/f/g.html"}]);
    });
    
    test("Empty page dir", 3, function() {
      deepEqual(runme("http://a.com/b/c/", "http://a.com/b/c/d/e.html"), [
                {"op": "$=", "text": "//a.com/b/c/d/e.html"},
                {"op": "=", "text": "/b/c/d/e.html"},
                {"op": "=", "text": "d/e.html"},
                {"op": "=", "text": "./d/e.html"}]);
      deepEqual(runme("http://a.com/b/c/", "http://a.com/b/c/d.html"), [
                {"op": "$=", "text": "//a.com/b/c/d.html"},
                {"op": "=", "text": "/b/c/d.html"},
                {"op": "=", "text": "d.html"},
                {"op": "=", "text": "./d.html"}]);
      deepEqual(runme("http://a.com/b/c/", "http://a.com/b/"), [
                {"op": "$=", "text": "//a.com/b/"},
                {"op": "=", "text": "/b/"},
                {"op": "$=", "text": "../"}]);
    });
    
    test("Lack of trailing url slash", 2, function() {
      deepEqual(runme("http://a.com/b/c/", "http://a.com/b"), [
                {"op": "$=", "text": "//a.com/b"},
                {"op": "=", "text": "/b"},
                {"op": "$=", "text": "../../b"}]);
      deepEqual(runme("http://a.com/b/c/", "http://a.com/b/c"), [
                {"op": "$=", "text": "//a.com/b/c"},
                {"op": "=", "text": "/b/c"},
                {"op": "$=", "text": "../c"}]);
    });

    var dwr = chrome.declarativeWebRequest;
    var myDWR = DeclarativeWebRequest.singleton;
    var allResourceTypes = [ "script", "image", "stylesheet", "object", 
                             "sub_frame", "other", "xmlhttprequest" ];

    module("DeclarativeWebRequest", {
      setup: function() {
        stop();
        dwr.onRequest.removeRules(null, function() {
          dwr.onRequest.getRules(null, function(rules) {
            equal(rules.length, 0, "No rules at test start");
            start();
          });
        });
      },
      teardown: function() {
        stop();
        dwr.onRequest.removeRules(null, function() {
          start();
        });
      }
    });

    function endToEndTest(title, filterText, nodeName, src, expectedBlock) {
      src = "https://chromeadblock.com/test/adblock_unittests/" + src;
      // Randomization required, because addRules does not clear the page-level
      // cache, so once a resource is loaded, it can't be blocked.
      var randomizeSource = true;
      if (randomizeSource)
        src += "?" + Math.random();
      asyncTest(title, function() {
        var filter = Filter.fromText(filterText);
        var rules = myDWR._getRules(filter, "tag1");
        dwr.onRequest.addRules(rules, function() {
          var node = $("<" + nodeName + ">", { src: src}).
            error(function() {
              ok(expectedBlock, "filter " + filterText + " blocked " + nodeName + " " + src);
              start();
            }).
            load(function() {
              ok(!expectedBlock, "filter " + filterText + " did not block " + nodeName + " " + src);
              start();
            });
          node.appendTo("#qunit-fixture");
        });
      });
    }

    endToEndTest("CSP has been updated to run tests (if this fails, see test source for how to modify CSP)", "csp_blocked_this_not_me", "img", "img.png", false);
    // The CSP entry you need in manifest.json is:
    // "content_security_policy": "default-src https://chromeadblock.com 'self'; script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'; connect-src *; frame-src 'self' https://chromeadblock.com",

    endToEndTest("Single image filter", "img.png", "img", 'img.png', true);
    endToEndTest("Complex image filter", "img$image,third-party,domain=~yahoo.com|~msn.com", "img", "img.png", true);
    endToEndTest("Complex image filter #2", "img$~third-party,domain=yahoo.com", "img", "img.png", false);

    test("_getPriority", function() {
      function check(filterText, expected) {
        var priority = myDWR._getPriority(Filter.fromText(filterText));
        equal(priority, expected, "Priority for filter " + filterText);
      }

      check("a", 100);
      check("@@a$document", 300);
      check("@@a", 200);
    });

    test("_getResourceTypes", function() {
      function check(filterText, expected) {
        var types = myDWR._getResourceTypes(Filter.fromText(filterText)).sort();
        var expected = JSON.parse(JSON.stringify(expected)).sort();
        deepEqual(types, expected, "ResourceTypes for filter " + filterText);
      }
      function without(list, item) { return list.filter(function(i) { return i !== item; }); }

      check("a", allResourceTypes);
      check("@@a$document", allResourceTypes);
      check("@@a$elemhide", allResourceTypes);
      check("a$image", ["image"]);
      check("a$image,script", ["image", "script"]);
      check("a$image,background,script,media", ["image", "script", "other"]);
      check("a$subdocument,object_subrequest", ["sub_frame", "object"]);
      check("a$~script", without(allResourceTypes, "script"));
      check("a$~image", without(allResourceTypes, "image")); // make sure "background" doesn't clobber it
      check("a$~image,~subdocument", without(without(allResourceTypes, "image"), "sub_frame"));
    });

    test("_getRules", function() {
      function wasBuiltRight(text, expectedRules) {
        var filter = Filter.fromText(text);
        var rules = myDWR._getRules(filter, "tag1");
        deepEqual(rules, expectedRules, "Rule from filter: " + text);
      }

      function condWithDomain(hostSuffix) {
        var template = new dwr.RequestMatcher({
          "resourceType": JSON.parse(JSON.stringify(allResourceTypes)),
          "stages": [ "onBeforeRequest" ],
          "url": { "urlMatches": "a" }
        });
        if (hostSuffix)
          template.firstPartyForCookiesUrl = { hostSuffix: hostSuffix };
        return template;
      }

      function ruleModified(modify) {
        var template = {
          "actions": [ new dwr.CancelRequest(), 
                       new dwr.SendMessageToExtension({message: "block"}) ],
          "conditions": [ condWithDomain(undefined) ],
          "priority": 100,
          "tags": [ "tag1" ]
        };
        modify(template);
        return template;
      }

      function tagBlockRuleModified(modify) {
        var template = {
          "actions": [ new dwr.IgnoreRules({ hasTag: "tag1" }) ],
          "conditions": [ condWithDomain(undefined) ],
          "priority": 101,
        };
        modify(template);
        return template;
      }

      wasBuiltRight("a", [ ruleModified(function() {}) ]);

      wasBuiltRight("a$script", [ ruleModified(function(rule) { 
        rule.conditions[0].resourceType = [ "script" ]; 
      }) ]);

      wasBuiltRight("a$~image", [ ruleModified(function(rule) {
        var t = rule.conditions[0].resourceType;
        t.splice(t.indexOf("image"), 1);
      }) ]);

      wasBuiltRight("a$image,script,object_subrequest", [ ruleModified(function(rule) {
        rule.conditions[0].resourceType = [ "script", "image", "object" ]; 
      }) ]);

      wasBuiltRight("a$~image,~script,~object_subrequest", [ ruleModified(function(rule) {
        var t = rule.conditions[0].resourceType;
        t.splice(t.indexOf("script"), 1);
        t.splice(t.indexOf("image"), 1);
        t.splice(t.indexOf("object"), 1);
      }) ]);

      wasBuiltRight("a$image,~image", [ ruleModified(function(rule) {
        rule.conditions[0].resourceType = [];
      }) ]);

      wasBuiltRight("a$third-party", [ ruleModified(function(rule) {
        rule.conditions[0].thirdPartyForCookies = true;
      }) ]);

      wasBuiltRight("a$~third-party", [ ruleModified(function(rule) {
        rule.conditions[0].thirdPartyForCookies = false;
      }) ]);

      wasBuiltRight("a$domain=b.com", [ ruleModified(function(rule) {
        rule.conditions[0] = condWithDomain("b.com");
      }) ]);

      wasBuiltRight("a$domain=b1.com|b2.com", [ ruleModified(function(rule) {
        rule.conditions = [];
        for (var suffix in { 'b1.com': 1, 'b2.com': 1 }) {
          rule.conditions.push(condWithDomain(suffix));
        }
      }) ]);

      wasBuiltRight("a$domain=b1.com|~s.b1.com", [ 
        ruleModified(function(rule) {
          rule.conditions[0] = condWithDomain("b1.com");
        }),
        tagBlockRuleModified(function(rule) {
          rule.conditions[0] = condWithDomain("s.b1.com");
        })
      ]);

      wasBuiltRight("a$domain=b1.com|~s.b1.com|b2.com|~s.b2.com|b3.com", [ 
        ruleModified(function(rule) {
          rule.conditions = [1, 2, 3].map(function(i) {
            return condWithDomain("b" + i + ".com");
          });
        }),
        tagBlockRuleModified(function(rule) {
          rule.conditions = [1, 2].map(function(i) { 
            return condWithDomain("s.b" + i + ".com");
          });
        })
      ]);

      wasBuiltRight("@@a", [ ruleModified(function(rule) {
        rule.priority = 200;
        rule.actions = [ new dwr.IgnoreRules( { lowerPriorityThan: 200 } ) ];
      }) ]);

      wasBuiltRight("@@a$~third-party,script,image,domain=b1.com|~s.b1.com", [
        ruleModified(function(rule) {
          rule.conditions[0].thirdPartyForCookies = false;
          rule.conditions[0].resourceType = [ "script", "image" ];
          rule.conditions[0].firstPartyForCookiesUrl = { hostSuffix: "b1.com" };
          rule.priority = 200;
          rule.actions = [ new dwr.IgnoreRules( { lowerPriorityThan: 200 } ) ];
        }),
        tagBlockRuleModified(function(rule) {
          rule.conditions[0].thirdPartyForCookies = false;
          rule.conditions[0].resourceType = [ "script", "image" ];
          rule.conditions[0].firstPartyForCookiesUrl = { hostSuffix: "s.b1.com" };
          rule.priority = 201;
        }),
      ]);

      wasBuiltRight("@@a$document", [ ruleModified(function(rule) {
        var c = rule.conditions[0];
        c.firstPartyForCookiesUrl = c.url;
        delete c.url;
        rule.priority = 300;
        rule.actions = [ new dwr.IgnoreRules( { lowerPriorityThan: 300 } ),
                         new dwr.SendMessageToExtension({message: "document" }) ];
      }) ]);

      wasBuiltRight("@@a$elemhide", [ ruleModified(function(rule) {
        var c = rule.conditions[0];
        c.firstPartyForCookiesUrl = c.url;
        delete c.url;
        rule.priority = 300;
        rule.actions = [ new dwr.SendMessageToExtension({message: "elemhide" }) ];
      }) ]);

      wasBuiltRight("@@a$popup", [ ]);

    });

  })();
  
  // END CHROME ONLY
} else {
  // SAFARI ONLY
  
  // END SAFARI ONLY
}
