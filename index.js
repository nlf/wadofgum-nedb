var Plugin = function (collection, options) {

    options = options || {};
    if (!options.db) {
        throw new Error('Must provide an NeDB database');
    }
    this.db = options.db;
    this.type = collection.name;

    this.db.ensureIndex({ fieldName: 'type', sparse: true });
};

Plugin.prototype.save = function (callback) {

    var self = this;
    self.validate(function (err) {

        if (err) {
            return callback(err);
        }

        self._type = self._model.type;
        self._model.db.insert(self, function (err) {

            self.id = self._id;
            delete self._id;
            delete self._type;

            callback(err);
        });
    });
};

Plugin.prototype.remove = function (callback) {

    var query = { _type: this._model.type, _id: this.id };
    this._model.db.remove(query, function (err) {

        callback(err);
    });
};

Plugin.count = function (query, callback) {

    if (typeof query === 'function') {
        callback = query;
        query = {};
    }

    query._type = this.type;
    this.db.count(query, callback);
};

Plugin.find = function (query, callback) {

    var self = this;
    query._type = self.type;
    self.db.find(query, function (err, models) {

        callback(err, [].concat(models).map(function (model) {

            model.id = model._id;
            return new self(model);
        }));
    });
};

Plugin.get = function (id, callback) {

    var self = this;
    var query = { _type: self.type, _id: id };
    self.db.findOne(query, function (err, model) {

        if (!model &&
           !err) {

            err = new Error('not found');
        }

        if (model) {
            model.id = model._id;
        }

        callback(err, model ? new self(model) : undefined);
    });
};

module.exports = Plugin;
