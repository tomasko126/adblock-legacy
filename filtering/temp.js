ud=undefined
bid = next_bucket_id++
cancelAction = [ new dwr.CancelRequest() ]
ignoreBelow = function(p) { return new dwr.IgnoreRules({ lowerPriorityThan: p }); }
smte = function(msg) { return new dwr.SendMessageToExtension({ message: msg }); }

yesDomains, noDomains = getFrickinYesAndNoDomainsFrom(filter)
basePriority = getBasePriorityFor(filter)
defaultActions = getDefaultActionFor(filter)

rules = []
for domain in yesDomains: // may contain undefined
  rules.push(_basicRule(false, filter, basePriority, bid, domain, defaultActions));
for domain in noDomains: // may be an empty list
  rules.push(_basicRule(true,  filter, basePriority, bid, domain));
return rules;

// a$
rules = [
  _basicRule(false, filter, 100, bid, ud,   [ cancelAction ])
];

// a$domain=d1
rules = [
  _basicRule(false, filter, 100, bid, "d1", [ cancelAction ])
];


// a$domain=d1,d2,d3
rules = [
  _basicRule(false, filter, 100, bid, "d1", [ cancelAction ]),
  _basicRule(false, filter, 100, bid, "d2", [ cancelAction ]),
  _basicRule(false, filter, 100, bid, "d3", [ cancelAction ]),
];

// a$domain=~e1
rules = [
  _basicRule(false, filter, 100, bid, ud,   [ cancelAction ]),
  _basicRule(true,  filter, 100, bid, "e1")
];

// a$domain=d1,d2,d3,~e1,~e2,~e3
rules = [
  _basicRule(false, filter, 100, bid, "d1", [ cancelAction ]),
  _basicRule(false, filter, 100, bid, "d2", [ cancelAction ]),
  _basicRule(false, filter, 100, bid, "d3", [ cancelAction ]),
  _basicRule(true,  filter, 100, bid, "e1")
  _basicRule(true,  filter, 100, bid, "e2")
  _basicRule(true,  filter, 100, bid, "e3")
];

// @@[any of the above]
rules = [
  _basicRule(false, filter, 200, bid, ud,   [ ignoreBelow(200) ]),
  _basicRule(true,  filter, 200, bid, ud)
]

// @@$document
rules = [
  _basicRule(false, filter, 300, bid, ud,   [ ignoreBelow(300), smte("document") ]),
  _basicRule(true,  filter, 300, bid, ud)
]

// @@$elemhide
rules = [
  _basicRule(false, filter, 300, bid, ud,   [ smte("elemhide") ]),
  _basicRule(true,  filter, 300, bid, ud)
]
