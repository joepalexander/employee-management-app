import { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrashAlt, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

import '../App.css';

import Header from './Header';
import Modal from './Modal';
import Input from './Input';
import Radio from './Radio';
import Select from './Select';
import Pagination from './Pagination';

import { LIST_EMPLOYEES, GET_EMPLOYEE } from '../graphql/queries';
import { CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE } from '../graphql/mutations';

import { departments, jobTitles } from '../constants';
import SearchBox from './SearchBox';

const schema = yup.object().shape({
  first_name: yup.string().required("First Name is required"),
  last_name: yup.string().required("Last Name is required"),
  email: yup.string().email().required("Email is required"),
  mobile: yup
    .string()
    .matches(/^[6-9]\d{9}$/, {
      message: "Not a valid number",
      excludeEmptyString: true,
    })
    .required("Mobile is required"),
  image_url: yup.string().url("Not a valid url"),
  gender: yup.string().required("Gender is required").uppercase(),
  department: yup.string().required("Department is required"),
  job_profile: yup.string().required("Job profile is required"),
  salary: yup.number().positive().required("Salary is required"),
});

function Employees() {
  const history = useHistory();

  const searchParams = new URLSearchParams(useLocation().search);

  const q = searchParams.get('q') ? searchParams.get('q') : '';

  const currentPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const pageSize = 10;

  const { loading, data } = useQuery(LIST_EMPLOYEES, { variables: {page: currentPage, pageSize, filter: q}, fetchPolicy: 'cache-and-network' });

  const [ getEmployee, { data: empResponse, loading: loadingEmployee } ] = useLazyQuery(GET_EMPLOYEE);

  const [createEmployee] = useMutation(CREATE_EMPLOYEE, { 
    update(cache, {data: { createEmployee: newEmployee }}) {
      const { listEmployees } = cache.readQuery({ query: LIST_EMPLOYEES });

      cache.writeQuery({
        query: LIST_EMPLOYEES,
        data: { 
          listEmployees: {
            employees: [...listEmployees.employees, newEmployee],
            total: listEmployees.total
          },
        },
      });
    }
  });

  const [updateEmployee] = useMutation(UPDATE_EMPLOYEE, {
    update(cache, {data: { updateEmployee }}) {
      const { listEmployees } = cache.readQuery({ query: LIST_EMPLOYEES });

      cache.writeQuery({
        query: LIST_EMPLOYEES,
        data: {
          listEmployees: {
            employees: listEmployees.employees.map((employee) => {
              if (employee.id === updateEmployee.id) {
                return {
                  ...updateEmployee,
                };
              } else return employee;
            })
          },
        },
      });
    }
  });

  const [deleteEmployee] = useMutation(DELETE_EMPLOYEE, {
    update(cache, {data: { deleteEmployee }}) {
      const { listEmployees } = cache.readQuery({ query: LIST_EMPLOYEES });

      cache.writeQuery({
        query: LIST_EMPLOYEES,
        data: {
          listEmployees: {
            employees: listEmployees.employees.filter(employee => employee.id !== deleteEmployee.id),
            total: listEmployees.total - 1
          },
        },
      });
    }
  });

  const { register, handleSubmit, errors, reset, setValue } = useForm({
    resolver: yupResolver(schema)
  });
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('add')
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (empResponse?.getEmployee) {
      setValue('first_name', empResponse?.getEmployee.first_name);
      setValue('last_name', empResponse?.getEmployee.last_name);
      setValue('email', empResponse?.getEmployee.email);
      setValue('mobile', empResponse?.getEmployee.mobile);
      setValue('image_url', empResponse?.getEmployee.image_url);
      setValue('gender', empResponse?.getEmployee.gender);
      setValue('department', empResponse?.getEmployee.department);
      setValue('job_profile', empResponse?.getEmployee.job_profile);
      setValue('salary', empResponse?.getEmployee.salary);
    }
  }, [empResponse?.getEmployee, setValue])

  useEffect(() => {
    if (query !== '') {
      searchParams.append('q', query);
    } else {
      searchParams.delete('q');
    }
    history.replace({search: searchParams.toString() });
  }, [query, history]);

  const onSubmit = async (data) => {
    if (empResponse?.getEmployee) {
      await updateEmployee({ variables: { employeeId: empResponse?.getEmployee.id, employee: data } });
      setMode('add');
    } else {
      await createEmployee({ variables: { employee: data } });
    }
    reset();
    setShowModal(false);
  };

  const handleOnEdit = (id) => {
    getEmployee({ variables: { employeeId: id }});
    setMode('edit');
    setShowModal(true);
  }

  const handleOnDelete = (id) => {
    deleteEmployee({ variables: { employeeId: id } });
  } 

  const onModalClose = () => {
    reset();
    setMode('add');
    setShowModal(false);
  }

  return (
    <>
      <Header
        onAddEmployee={() => {
          setShowModal(true);
        }}
      />
      <div className="container mt-4">
        {loading ? (
          <p>loading...</p>
        ) : (
          <>
            <SearchBox
              name="query"
              placeholder="Search Employees..."
              value={query}
              onChange={(value) => setQuery(value)}
            />
            {query !== "" && (
              <div className="mt-4 d-flex justify-content-between align-items-center border-secondary border-top border-bottom p-2">
                <span >Found <strong>{data.listEmployees.total}</strong> employees matching {query}</span>
                <button className="btn text-primary" onClick={(e) => {
                  e.preventDefault();
                  setQuery('');
                }}>
                  <span><FontAwesomeIcon icon={faTimesCircle} /></span>
                  clear filter
                </button>
              </div>
            )}
            <table className="table mt-4">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Gender</th>
                  <th>Profile</th>
                  <th>Department</th>
                  <th>Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.listEmployees.employees.map(
                  ({
                    id,
                    first_name,
                    last_name,
                    email,
                    image_url,
                    gender,
                    mobile,
                    department,
                    job_profile,
                    salary,
                  }) => (
                    <tr key={id}>
                      <td>
                        <div className="d-inline-flex align-items-center">
                          <div className="profile-image-container">
                            <img src={image_url} alt={first_name} />
                          </div>
                          <h6 className="ml-2">{`${first_name} ${last_name}`}</h6>
                        </div>
                      </td>
                      <td>{email}</td>
                      <td>{mobile}</td>
                      <td>{gender}</td>
                      <td>{job_profile}</td>
                      <td>{department}</td>
                      <td>&#8377; {salary}</td>
                      <td>
                        <button
                          className="btn btn-success btn-sm mr-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOnEdit(id);
                          }}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button className="btn btn-danger btn-sm ml-1">
                          <FontAwesomeIcon
                            icon={faTrashAlt}
                            onClick={(e) => {
                              e.preventDefault();
                              handleOnDelete(id);
                            }}
                          />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            <Pagination
              className="pagination-wrapper"
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={data.listEmployees.total}
            >
              {({
                pages,
                previousPage,
                nextPage,
                hasPreviousPage,
                hasNextPage,
                totalPages,
              }) => (
                <ul className="pagination">
                  <li className="pagination-meta">
                    Page {currentPage} of {totalPages}
                  </li>
                  {hasPreviousPage && (
                    <>
                      <li className="page-item pagination-first">
                        <Link
                          className="page-link"
                          to={{
                            pathname: "/",
                            search: query ? `page=1&q=${query}` : "page=1",
                          }}
                        >
                          First
                        </Link>
                      </li>
                      <li className="page-item pagination-prev">
                        <Link
                          className="page-link"
                          to={{
                            pathname: "/",
                            search: query
                              ? `page=${previousPage}&q=${query}`
                              : `page=${previousPage}`,
                          }}
                        >
                          &#8592;&nbsp;Previous
                        </Link>
                      </li>
                    </>
                  )}
                  {pages.map((page) => (
                    <li
                      key={page}
                      className={
                        currentPage === page ? "page-item active" : "page-item"
                      }
                    >
                      <Link
                        className="page-link"
                        to={{
                          pathname: "/",
                          search: query
                            ? `page=${page}&q=${query}`
                            : `page=${page}`,
                        }}
                      >
                        {page}
                      </Link>
                    </li>
                  ))}
                  {hasNextPage && (
                    <>
                      <li className="page-item pagination-first">
                        <Link
                          className="page-link"
                          to={{
                            pathname: "/",
                            search: query
                              ? `page=${nextPage}&q=${query}`
                              : `page=${nextPage}`,
                          }}
                        >
                          Next&nbsp;&#8594;
                        </Link>
                      </li>
                      <li className="page-item pagination-prev">
                        <Link
                          className="page-link"
                          to={{
                            pathname: "/",
                            search: query
                              ? `page=${totalPages}&q=${query}`
                              : `page=${totalPages}`,
                          }}
                        >
                          Last
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              )}
            </Pagination>
          </>
        )}
        {loadingEmployee ? (
          <h1>loading...</h1>
        ) : (
          <Modal show={showModal}>
            <div className="modal-header">
              <h5 className="modal-title">
                {mode === "add"
                  ? "Add Employee Details"
                  : "Update Employee Details"}
              </h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
                onClick={onModalClose}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="row">
                  <div className="col">
                    <Input
                      name="first_name"
                      label="First Name"
                      type="text"
                      placeholder="Enter first name"
                      register={register}
                      error={errors.first_name}
                    />
                  </div>
                  <div className="col">
                    <Input
                      name="last_name"
                      label="Last Name"
                      type="text"
                      placeholder="Enter last name"
                      register={register}
                      error={errors.last_name}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col">
                    <Input
                      name="email"
                      label="Email"
                      type="email"
                      placeholder="Enter email"
                      register={register}
                      error={errors.email}
                    />
                  </div>
                  <div className="col">
                    <Input
                      name="mobile"
                      label="Mobile"
                      type="text"
                      placeholder="Enter mobile"
                      register={register}
                      error={errors.mobile}
                    />
                    <small className="form-text text-muted">
                      Mobile number must start with 7-9 and must be of length
                      10.
                    </small>
                  </div>
                </div>
                <div className="row">
                  <div className="col">
                    <Input
                      name="image_url"
                      label="Image Url"
                      type="text"
                      placeholder="Enter image url"
                      register={register}
                      error={errors.image_url}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col">
                    <div className="form-group">
                      <label className="d-block">Gender</label>
                      <Radio
                        name="gender"
                        label="Gender"
                        value="male"
                        register={register}
                      />
                      <Radio
                        name="gender"
                        label="Gender"
                        value="female"
                        register={register}
                      />
                      <div className="text-danger">
                        <small>{errors.gender?.message}</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col">
                    <Select
                      name="department"
                      label="Department"
                      options={departments}
                      register={register}
                      error={errors.department}
                    />
                  </div>
                  <div className="col">
                    <Select
                      name="job_profile"
                      label="Job Title"
                      options={jobTitles}
                      register={register}
                      error={errors.job_profile}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col">
                    <Input
                      name="salary"
                      label="Salary"
                      type="number"
                      placeholder="Enter salary"
                      register={register}
                      error={errors.salary}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  {mode === "add" ? "Add Employee" : "Update Employee"}
                </button>
              </form>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}

export default Employees
