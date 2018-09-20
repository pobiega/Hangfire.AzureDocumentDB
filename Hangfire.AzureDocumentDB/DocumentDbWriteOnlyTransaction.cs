﻿using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

using Hangfire.States;
using Hangfire.Storage;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;

using Hangfire.Azure.Queue;
using Hangfire.Azure.Documents;
using Hangfire.Azure.Documents.Helper;

namespace Hangfire.Azure
{
    internal class DocumentDbWriteOnlyTransaction : JobStorageTransaction
    {
        private readonly DocumentDbConnection connection;
        private readonly List<Action> commands = new List<Action>();

        public DocumentDbWriteOnlyTransaction(DocumentDbConnection connection) => this.connection = connection;
        private void QueueCommand(Action command) => commands.Add(command);
        public override void Commit() => commands.ForEach(command => command());
        public override void Dispose() { }

        #region Queue

        public override void AddToQueue(string queue, string jobId)
        {
            if (string.IsNullOrEmpty(queue)) throw new ArgumentNullException(nameof(queue));
            if (string.IsNullOrEmpty(jobId)) throw new ArgumentNullException(nameof(jobId));

            IPersistentJobQueueProvider provider = connection.QueueProviders.GetProvider(queue);
            IPersistentJobQueue persistentQueue = provider.GetJobQueue();
            QueueCommand(() => persistentQueue.Enqueue(queue, jobId));
        }

        #endregion

        #region Counter

        public override void DecrementCounter(string key)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

            QueueCommand(() =>
            {
                Counter data = new Counter
                {
                    Key = key,
                    Type = CounterTypes.Raw,
                    Value = -1
                };

                Task<ResourceResponse<Document>> task = connection.Storage.Client.CreateDocumentAsync(connection.Storage.CollectionUri, data);
                task.Wait();
            });
        }

        public override void DecrementCounter(string key, TimeSpan expireIn)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (expireIn.Duration() != expireIn) throw new ArgumentException(@"The `expireIn` value must be positive.", nameof(expireIn));

            QueueCommand(() =>
            {
                Counter data = new Counter
                {
                    Key = key,
                    Type = CounterTypes.Raw,
                    Value = -1,
                    ExpireOn = DateTime.UtcNow.Add(expireIn)
                };

                Task<ResourceResponse<Document>> task = connection.Storage.Client.CreateDocumentAsync(connection.Storage.CollectionUri, data);
                task.Wait();
            });
        }

        public override void IncrementCounter(string key)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

            QueueCommand(() =>
            {
                Counter data = new Counter
                {
                    Key = key,
                    Type = CounterTypes.Raw,
                    Value = 1
                };

                Task<ResourceResponse<Document>> task = connection.Storage.Client.CreateDocumentAsync(connection.Storage.CollectionUri, data);
                task.Wait();
            });
        }

        public override void IncrementCounter(string key, TimeSpan expireIn)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (expireIn.Duration() != expireIn) throw new ArgumentException(@"The `expireIn` value must be positive.", nameof(expireIn));

            QueueCommand(() =>
            {
                Counter data = new Counter
                {
                    Key = key,
                    Type = CounterTypes.Raw,
                    Value = 1,
                    ExpireOn = DateTime.UtcNow.Add(expireIn)
                };

                Task<ResourceResponse<Document>> task = connection.Storage.Client.CreateDocumentAsync(connection.Storage.CollectionUri, data);
                task.Wait();
            });
        }

        #endregion

        #region Job

        public override void ExpireJob(string jobId, TimeSpan expireIn)
        {
            if (string.IsNullOrEmpty(jobId)) throw new ArgumentNullException(nameof(jobId));
            if (expireIn.Duration() != expireIn) throw new ArgumentException(@"The `expireIn` value must be positive.", nameof(expireIn));

            QueueCommand(() =>
            {
                int epochTime = DateTime.UtcNow.Add(expireIn).ToEpoch();
                Uri spExpireJobUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "expireJob");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spExpireJobUri, jobId, epochTime);
                task.Wait();
            });
        }

        public override void PersistJob(string jobId)
        {
            if (string.IsNullOrEmpty(jobId)) throw new ArgumentNullException(nameof(jobId));

            QueueCommand(() =>
            {
                Uri spPersistJobUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "persistJob");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spPersistJobUri, jobId);
                task.Wait();
            });
        }

        #endregion

        #region State

        public override void SetJobState(string jobId, IState state)
        {
            if (string.IsNullOrEmpty(jobId)) throw new ArgumentNullException(nameof(jobId));
            if (state == null) throw new ArgumentNullException(nameof(state));

            QueueCommand(() =>
            {
                State data = new State
                {
                    JobId = jobId,
                    Name = state.Name,
                    Reason = state.Reason,
                    CreatedOn = DateTime.UtcNow,
                    Data = state.SerializeData()
                };

                Uri spSetJobStateUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "setJobState");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spSetJobStateUri, jobId, data);
                task.Wait();
            });
        }

        public override void AddJobState(string jobId, IState state)
        {
            if (string.IsNullOrEmpty(jobId)) throw new ArgumentNullException(nameof(jobId));
            if (state == null) throw new ArgumentNullException(nameof(state));

            QueueCommand(() =>
            {
                State data = new State
                {
                    JobId = jobId,
                    Name = state.Name,
                    Reason = state.Reason,
                    CreatedOn = DateTime.UtcNow,
                    Data = state.SerializeData()
                };

                Task<ResourceResponse<Document>> task = connection.Storage.Client.CreateDocumentAsync(connection.Storage.CollectionUri, data);
                task.Wait();
            });
        }

        #endregion

        #region Set

        public override void RemoveFromSet(string key, string value)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (string.IsNullOrEmpty(value)) throw new ArgumentNullException(nameof(value));

            QueueCommand(() =>
            {
                Uri spRemoveFromSetUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "removeFromSet");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spRemoveFromSetUri, key, value);
                task.Wait();
            });
        }

        public override void AddToSet(string key, string value) => AddToSet(key, value, 0.0);

        public override void AddToSet(string key, string value, double score)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (string.IsNullOrEmpty(value)) throw new ArgumentNullException(nameof(value));

            QueueCommand(() =>
            {
                Set set = new Set
                {
                    Key = key,
                    Value = value,
                    Score = score,
                    CreatedOn = DateTime.UtcNow
                };

                Uri spAddToSetUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "addToSet");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spAddToSetUri, set);
                task.Wait();
            });
        }

        public override void PersistSet(string key)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));

            QueueCommand(() =>
            {
                Uri spPersistSet = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "persistSet");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spPersistSet, key);
                task.Wait();
            });
        }
        public override void ExpireSet(string key, TimeSpan expireIn)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));

            QueueCommand(() =>
            {
                Uri spExpireSet = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "expireSet");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spExpireSet, key, DateTime.UtcNow.Add(expireIn).ToEpoch());
                task.Wait();
            });
        }

        public override void AddRangeToSet(string key, IList<string> items)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));
            if (items == null) throw new ArgumentNullException(nameof(items));

            QueueCommand(() =>
            {
                List<Set> sets = items.Select(value => new Set
                {
                    Key = key,
                    Value = value,
                    Score = 0.00,
                    CreatedOn = DateTime.UtcNow
                }).ToList();

                Uri spAddRangeToSet = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "addRangeToSet");
                Task<StoredProcedureResponse<int>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<int>(spAddRangeToSet, sets);
                task.Wait();

            });
        }

        #endregion

        #region  Hash

        public override void RemoveHash(string key)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

            QueueCommand(() =>
            {
                Uri spRemoveHashUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "removeHash");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spRemoveHashUri, key);
                task.Wait();
            });
        }

        public override void SetRangeInHash(string key, IEnumerable<KeyValuePair<string, string>> keyValuePairs)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (keyValuePairs == null) throw new ArgumentNullException(nameof(keyValuePairs));

            QueueCommand(() =>
            {
                Hash[] sources = keyValuePairs.Select(k => new Hash
                {
                    Key = key,
                    Field = k.Key,
                    Value = k.Value.TryParseToEpoch()
                }).ToArray();

                Uri spSetRangeHashUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "setRangeHash");
                Task<StoredProcedureResponse<int>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<int>(spSetRangeHashUri, key, sources);
                task.Wait();
            });
        }

        #endregion

        #region List

        public override void InsertToList(string key, string value)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (string.IsNullOrEmpty(value)) throw new ArgumentNullException(nameof(value));

            QueueCommand(() =>
            {
                List data = new List
                {
                    Key = key,
                    Value = value,
                    CreatedOn = DateTime.UtcNow
                };

                Task<ResourceResponse<Document>> task = connection.Storage.Client.CreateDocumentAsync(connection.Storage.CollectionUri, data);
                task.Wait();
            });
        }

        public override void RemoveFromList(string key, string value)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));
            if (string.IsNullOrEmpty(value)) throw new ArgumentNullException(nameof(value));

            QueueCommand(() =>
            {
                Uri spRemoveFromListUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "removeFromList");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spRemoveFromListUri, key, value);
                task.Wait();
            });
        }

        public override void TrimList(string key, int keepStartingFrom, int keepEndingAt)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentNullException(nameof(key));

            QueueCommand(() =>
            {
                Uri spTrimListUri = UriFactory.CreateStoredProcedureUri(connection.Storage.Options.DatabaseName, connection.Storage.Options.CollectionName, "trimList");
                Task<StoredProcedureResponse<bool>> task = connection.Storage.Client.ExecuteStoredProcedureAsync<bool>(spTrimListUri, key, keepStartingFrom, keepEndingAt);
                task.Wait();
            });
        }

        #endregion

    }
}