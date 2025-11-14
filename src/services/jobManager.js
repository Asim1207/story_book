const { v4: uuidv4 } = require('uuid');

const jobs = {};

const createJob = () => {
  const jobId = uuidv4();
  jobs[jobId] = {
    status: 'pending',
    story: null,
    error: null,
  };
  return jobId;
};

const updateJobStatus = (jobId, status, result = null, error = null) => {
  if (jobs[jobId]) {
    jobs[jobId].status = status;
    if (result) {
      jobs[jobId].story = result;
    }
    if (error) {
      jobs[jobId].error = error;
    }
  }
};

const getJob = (jobId) => {
  return jobs[jobId];
};

module.exports = { createJob, updateJobStatus, getJob };
