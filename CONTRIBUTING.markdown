# Contributing

## Coding Style
Code you submit to AdBlock should conform to the following style rules, unless you have a good reason to break the rules :)

Comment every non-one-liner function that you write with a description of what it does, a list of inputs, and what it returns. See background.js for some examples. When in doubt about whether a chunk of code makes sense, lead it with a comment explaining what's going on. When you implement strange-looking code to handle Issue 1234, it suffices to say `// Issue 1234` so readers know where to learn more. In general, err on the side of too many comments, since dozens of strangers may read your code this year without understanding as much as you do about the context.

Variables should be clearly named instead of short. `EnumsAreNamed.LIKETHIS`; `ClassesAreNamedLikeThis`; `functionsNamedLikeThis`; `_privateFuntionsLikeThis`; `variables_like_this`; `_private_variables_like_this` ("private" meaning "not meant for use outside this object.") When in doubt, follow the capitalization of the code around you.

There are lots of ways in JavaScript to define a class, its constructor, and its prototype. Follow this format:

```javascript
function ClassName(x, y) {
  this._privateVar1 = x;
  this.publicVar2 = y;
}
ClassName.staticMethod = function(x) {
};
ClassName.prototype = {
  method1: function(x) {
  },
  method2: function(x) {
  }
};
```

Equality should be `===`, not `==`. In regular expressions, put a `\` before every non-special character except `[a-zA-Z0-9_-]` so that it's obvious that all other characters are special characters. E.g. `/^\@\@\|\|ads-r-us\.com(\/ad_content)+$/`

Use spaces, not tabs, to indent your code.  You can configure your editor to insert spaces when you press Tab.

We didn't always have a style guide, so unfortunately the code isn't 100% adherent to the rules above. Refactoring is great -- whenever you touch some code, feel free to clean it up.

## Update the CHANGELOG
If you're making changes that should be publicly announced, put a summary in the CHANGELOG under the heading of "Unreleased". That heading will be replaced with the new version number when the next release happens.
