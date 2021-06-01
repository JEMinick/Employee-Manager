const mysql = require('mysql');
const inquirer = require('inquirer');

let bDebugging = false;

let dbConfig = {
  host: 'localhost',
  // Your port; if not 3306
  port: 3306,
  // Your username
  user: 'root',
  // Be sure to update with your own MySQL password!
  password: 'root',
  database: 'employeesDB',
};

let connection = mysql.createConnection( dbConfig );

connection.connect( (err) => {
  if (err) throw err;
  displayMainMenu();
});

const reConnectDB = () => {
  connection.end();
  connection = mysql.createConnection( dbConfig );
};

const createMgrInfo = () => {
  let bError = false;
  let sQuery="";
  let queryRows=[];
  let err=null;
  
  sQuery = `DELETE from mgridlist where mgrid > 0;`;
  // connection.query( query, (err, queryRows) => {
  connection.beginTransaction();
  queryRows = connection.query( sQuery, (err) );
  if ( err ) {
    console.error( err );
    bError = true;
  } else {
    connection.commit();
    sQuery = `INSERT HIGH_PRIORITY `
           + `INTO mgridlist `
           + `SELECT Employees.manager_id as mgrid `
           + `FROM Employees `
           + `GROUP BY Employees.manager_id `
           + `HAVING ( ((Employees.manager_id)>0) );`;
    connection.beginTransaction();
    // connection.query( sQuery, (err, queryRows) => {
    queryRows = connection.query( sQuery, (err) );
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      connection.commit();
    }
  }
  // ------------------------------------------------------------
  if ( !bError ) {
    sQuery = `DELETE FROM mgrinfo WHERE mgrid > 0;`;
    connection.beginTransaction();
    // connection.query(query, (err, queryRows) => {
    queryRows =  connection.query( sQuery, (err) )
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      connection.commit();
    }

    sQuery = `INSERT INTO mgrinfo `
           + `SELECT mgridlist.mgrid, `
           +   `CONCAT( employees.first_name, " ", employees.last_name ), `
           +   `employees.role_id, `
           +   `roles.title, `
           +   `roles.salary, `
           +   `roles.department_id, `
           +   `departments.name `
           + `FROM ((MgrIdList `
           +   `INNER JOIN employees ON MgrIdList.mgrid = employees.id) `
           +   `INNER JOIN roles ON employees.role_id = roles.id) `
           +   `INNER JOIN departments ON roles.department_id = departments.id;`;
              
    connection.beginTransaction();
    // connection.query( sQuery, (err, queryRows) => {
      queryRows =  connection.query( sQuery, (err) );
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      connection.commit();
    }

  }
};

const displayMgrInfo = () => {
  let query = `SELECT * from mgrinfo;`;
  connection.query( query, (err, res) => {
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      for( var i=0; i < res.length; i++ ) {
        console.log( JSON.stringify( res[i].MgrID ) );
      }
    }
  });
};

const retrieveRecordFieldData = ( sField, sRecord ) =>
{
  let aRecordInfo = sRecord.split('|');
  let sFieldData = "";
  var iDataFieldNo = -1;
  
  for( var i=0; (i < sRecord.length) && (iDataFieldNo < 0); i++ )
  {
    switch( i ) {
      case 0:
        if ( sField === 'ID' ) {
          iDataFieldNo=i;
        }
        break;
      case 1:
        if ( sField === 'First Name' ) {
          iDataFieldNo=i;
        }
        break;
      case 2:
        if ( sField === 'Last Name' ) {
          iDataFieldNo=i;
        }
        break;
      case 3:
        if ( sField === 'Title' ) {
          iDataFieldNo=i;
        }
        break;
      case 4:
        if ( sField === 'Department' ) {
          iDataFieldNo=i;
        }
        break;
      case 5:
        if ( sField === 'Salary' ) {
          iDataFieldNo=i;
        }
        break;
      case 6:
        if ( sField === 'Manager' ) {
          iDataFieldNo=i;
        }
        break;
    }
    
    if ( iDataFieldNo >= 0 ) {
      switch ( iDataFieldNo ) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
            if ( aRecordInfo[iDataFieldNo] ) {
              if ( iDataFieldNo < aRecordInfo.length ) {
                sFieldData = aRecordInfo[iDataFieldNo];
              }
            }
          break;
      }
    }

  }
  
  return sFieldData;
}

const asDisplayColumns   = ['ID','First Name','Last Name','Title','Department','Salary','Manager'];
const aiDisplayColWidths = [ 2,   12,          12,         20,     15,          6,       20 ];

let sPageColHdr="";
let sPageColDashes="";
let sDisplayRowDelim="";

// isOutputColumn() determines if a query result field is 
// being displayed on the screen:
const isOutputColumn = ( sFieldName ) => {
  let bFound=false;
  var sField2Match = sFieldName.trim().toLowerCase();
  asDisplayColumns.forEach( (element) => {
    var sDisplayField = element.trim().toLowerCase();
    if ( sDisplayField.length === sField2Match.length )
      if ( sDisplayField === sField2Match )
        bFound = true;
  });
  return bFound;
}

const createRowDelimiter = ( iRowLen ) => {
  var sDashes = "";
  for( var d=0; d < iRowLen; d++ ) {
    sDashes += "-";
  }
  return sDashes;
}

const displayAllEmployees = (sGroupByField) => {

  // First, create a inner joinable table of Manager Information:
  // createMgrInfo();
  // displayMgrInfo();

  // console.log( `sGroupByField: ${sGroupByField}` );

  let sOrderBy="";
  switch( sGroupByField ) {
    case( 'Department' ):
      sOrderBy = `roles.department_id`;
      break;
    case( 'Title' ):
      sOrderBy = `roles.title`;
      break;
    case( 'Manager' ):
      sOrderBy = `mgrinfo.manager`;
      break;
    default:
      sGroupByField = "";
      sOrderBy = "employees.id";
    }

let sQuery = `SELECT `
           + `employees.id AS ID, `
           + `employees.first_name AS "First Name", `
           + `employees.last_name AS "Last Name", `
           + `Roles.title AS Title, `
           + `Departments.name AS Department, `
           + `Roles.salary AS Salary, `
           + `MgrInfo.Manager, `
           + `MgrInfo.MgrTitle, `
           + `MgrInfo.MgrSalary `
           + `FROM MgrInfo `
           + `INNER JOIN ((employees `
           + `  INNER JOIN Roles ON employees.role_id = Roles.id) `
           + `  INNER JOIN Departments ON Roles.department_id = Departments.id) `
           + `ON MgrInfo.MgrID = employees.manager_id `
           + `ORDER BY ${sOrderBy};`;

  // console.log( sQuery );

  connection.query( sQuery, (err, res) => {
    if ( err ) {
      console.error( err );
    } else {
      
      // Needs to match the previous query:
      
      // console.log( `--------------------------------------------------------------------`);
      // console.log( "QUERY:" );
      // console.log( sQuery );
      // console.log( `--------------------------------------------------------------------`);
      // console.log( `MgrInfo query response:` );
      // console.log( res );
      // console.log( `--------------------------------------------------------------------`);
      // let sResData = JSON.stringify(res);
      // console.log( sResData );
      // console.log( `--------------------------------------------------------------------`);
      
      // console.log( `-------------------------------------------------------------------` );
      // console.log( "" );

      let bCreateColHdr = (sPageColHdr.length === 0)
      let aColumnHdrs=[];  // contains the names of each db-field
      let aRecInfoData=[]; // contains the pipe-delimited record

      let sGroupFieldMatch = "";
      
      // ForEach record in the query results:
      for( let iRecNo=0; iRecNo < res.length; iRecNo++ ) {
        
        let sRecord = JSON.stringify(res[iRecNo]);
        
        // Strip any leading/trailing curly brackets from the record:
        if ( (sRecord[0] === '{') && (sRecord[sRecord.length-1] === '}') ) {
          sRecord = sRecord.substr(1,sRecord.length-2);
        }
        
        let sRecordData="";
        var sFields = sRecord.split(",");
        let sGroupInfo = "";
        
        // ForEach field within the query record result:
        for ( var iColNo=0; iColNo < sFields.length; iColNo++ )
        {
          var iAttrNo = iColNo+1;
          var sAttrNo= ( (iAttrNo < 10 ? "0" : "") + iAttrNo );
          var sFieldInfo = sFields[iColNo];

          var sFieldAttrValue = sFieldInfo.split(":");
          var sRecordFieldInfo = "";
          var sRecordFieldInfo0="";
          var sRecordFieldInfo1="";

          // if either of the 2 attribute/value combos is a quoted string, remove the quotes:
          for( var i=0; i < sFieldAttrValue.length; i++ ) {
            switch( i )
            {
              case 0: // Attribute:
                sRecordFieldInfo0 = sFieldAttrValue[i];
                if ( (sRecordFieldInfo0[0] === '"') && (sRecordFieldInfo0[sRecordFieldInfo0.length-1] === '"') )
                   sRecordFieldInfo0 = sRecordFieldInfo0.substr(1,sRecordFieldInfo0.length-2);
                if ( bCreateColHdr ) {
                  if ( isOutputColumn(sRecordFieldInfo0) )
                    aColumnHdrs.push(sRecordFieldInfo0.trim());
                }
                sRecordFieldInfo = sRecordFieldInfo0;
                break;
              case 1: // Value:
                sRecordFieldInfo1 = (sFieldAttrValue[i] ? sFieldAttrValue[i] : "");
                if ( sRecordFieldInfo1.length > 1 )
                   if ( (sRecordFieldInfo1[0] === '"') && (sRecordFieldInfo1[sRecordFieldInfo1.length-1] === '"') )
                     sRecordFieldInfo1 = sRecordFieldInfo1.substr(1,sRecordFieldInfo1.length-2);
                if ( sRecordFieldInfo1 === 'null' )
                  sRecordFieldInfo1 = "";
                sRecordFieldInfo += ( " :: " + sRecordFieldInfo1 );
                sRecordData += ( ((sRecordData.length > 0) ? "|" : "") + sRecordFieldInfo1 );
                
                if ( sGroupByField.length > 0 ) {
                  if ( sGroupByField === sRecordFieldInfo0 ) {
                    if ( iRecNo === 0 ) {
                      // the first group:
                      sGroupFieldMatch = sRecordFieldInfo1;
                      sGroupInfo = `\n${sRecordFieldInfo0}: "${sRecordFieldInfo1}"`;
                    } else if ( sGroupFieldMatch !== sRecordFieldInfo1 ) {
                      // A group change:
                      sGroupFieldMatch = sRecordFieldInfo1;
                      sGroupInfo = `\n${sRecordFieldInfo0}: "${sRecordFieldInfo1}"`;
                    }
                  }
                };
                break;
              default:
                break;
            }
          } // endFor( k ) Attribute:Value pair
          
        } // endFor( iColNo ) : Each Field
        
        // Objective:
        // ['ID','First_Name','Last_Name','Title','Department','Salary','Manager'];
        // [ 2,   10,          10,         18,     11,          6,       16];
        // ID  First_Name  Last_Name-  Title-------------  Department-  Salary  Manager---------
        
        if ( bCreateColHdr ) {
          iColNo=0;
          aColumnHdrs.forEach( element => {
            var sFieldColHdr=element;
            var sSpaces = "";
            var sDashes = "";
            for( let j=0; j < aiDisplayColWidths[iColNo]; j++ ) {
              sSpaces += " ";
              sDashes += "-";
            }
            sFieldColHdr += sSpaces;
            sFieldColHdr = sFieldColHdr.substr(0,aiDisplayColWidths[iColNo]);
            sPageColHdr += ( sFieldColHdr + ((iColNo < aiDisplayColWidths.length-1) ? "  " : "" ) );
            sPageColDashes += ( sDashes + ((iColNo < aiDisplayColWidths.length-1) ? "  " : "" ) );
            iColNo++;
          });
          bCreateColHdr = false;
          sDisplayRowDelim = createRowDelimiter( sPageColDashes.length );
        }
        
        if ( iRecNo === 0 ) {
          console.log( sDisplayRowDelim );
          console.log( sPageColHdr );
          console.log( sPageColDashes );
        }

        aRecInfoData.push( sRecordData );

        if ( sGroupInfo.length > 0 ) {
          console.log( sGroupInfo );
          sGroupInfo="";
        }
        
        // Build a displayable row to output to the console:
        iColNo=0; 
        let sDataOutput="";
        asDisplayColumns.forEach( (sColHdr) => {
          var sFieldData = retrieveRecordFieldData( sColHdr, sRecordData );
          var sSpaces = "";
          for( let j=0; j < aiDisplayColWidths[iColNo]; j++ ) {
            sSpaces += " ";
          }
          sFieldData += sSpaces;
          sFieldData = sFieldData.substr(0,aiDisplayColWidths[iColNo]);
          sDataOutput += ( sFieldData + ( (iColNo < asDisplayColumns.length-1) ? "  " : "") );
          iColNo++;
        });
        console.log( sDataOutput );
        
        // If I want to add a line of dashes to the display output between each record:
        // console.log( sPageColDashes );
        
      } // endForEach( record )
      
      console.log( sDisplayRowDelim );
    }
    displayMainMenu();
  });
};

// let secondsLeft = 0;
// const runQuery = ( sQuery, iSecondsToPause ) => {
//   let bError=false;
//   let queryRows=[];
  
//   secondsLeft = iSecondsToPause;
//   let iTotalMilliSecs = secondsLeft*1000;

//   // Execute the query:
//   var err=null;
//   connection.beginTransaction();
//   console.log( sQuery );
//   queryRows = connection.query( sQuery, (err) );
//   if ( err ) {
//     console.error( err );
//     bError = true;
//   } else {
//     connection.commit();
//   }

//   if ( !bError ) {
//     var timerInterval = setInterval( function() {
//       secondsLeft--;
//       if (secondsLeft === 0) {
//         // Stops execution of action at set interval
//         clearInterval(timerInterval);
//         // var sQueryResults = JSON.stringify( queryRows ? queryRows : "" );
//         // console.log( `Query Rows === ${sQueryResults}` );
//         return queryRows;
//       }

//     }, iTotalMilliSecs );
//   }

//   return( queryRows );
// }

let bEmployeeExists=false;

const verifyEmployeeADD = (sFirstName,sLastName) => {
  let bError = false;
  let err;
  let queryRows;
  let iFound=0;
  let bConfirmed=false;
  
  let sQuery = `SELECT first_name, last_name FROM employees `
             + `WHERE first_name = "${sFirstName}" AND last_name = "${sLastName}";`;
  if ( bDebugging )
    console.log( sQuery );

  // queryRows = runQuery(sQuery,1);
  // if ( queryRows )
  // {
  //   console.log( `Back from runQuery()` );
  //   // var sQueryRows = JSON.stringify( queryRows );
  //   // console.log( sQueryRows );
  // }

  // queryRows = connection.query( sQuery, (err) );
  connection.query( sQuery, (err, queryRows) => {
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      if ( queryRows ) {
        if ( queryRows.length > 0 ) {
          queryRows.forEach( ({ first_name, last_name }) => {
            if ( bDebugging )
              console.log( `Matched employee: [${first_name} ${last_name}]` );
            bEmployeeExists = true;
            iFound++;
          });
        }
      }
      if ( iFound === 0 ) {
        if ( bDebugging )
          console.log( `the employee was NOT found...` );
      }
    }
  });

  inquirer
  .prompt({
    name: 'action',
    type: 'list',
    message: 'Are you sure you wish to ADD this employeee?',
    choices: [
      'Yes',
      'No'
    ],
    })
  .then( (answer) => {
    
    // console.log( `======================================================` );
    // for( var i=0; i < employeeInfo.length; i++ ) {
    //   var aEmpInfo = JSON.stringify(employeeInfo[i]).split(':');
    //   if ( aEmpInfo.length === 2 )
    //     console.log( aEmpInfo[0], ":", aEmpInfo[1] );
    // }
    // console.log( `======================================================` );
    
      if ( answer.action === 'Yes' ) {
        bConfirmed = (iFound === 0);
        if ( bConfirmed )
        {
          if ( bDebugging )
            console.log( "Adding new employee information..." );
          displayMainMenu();
        }
      }

    });

  // if ( bConfirmed )
  // {
  //   console.log( "Adding new employee information..." );
  //   displayMainMenu();
  // }
  // else {
  //   // displayMainMenu();
  // }
  // return( bConfirmed );
};

function retrieveEmployeeInfo( empInfo ) {
  var bIsValidData=true;
  let aFieldData=[];

  for( var iFieldIdx=0; iFieldIdx < empInfo.length; iFieldIdx++ )
  {
    var sData = JSON.stringify(empInfo[iFieldIdx]);
    if ( sData.length > 1 )
      if ( sData[0] === '{' && sData[sData.length-1] === '}' )
        sData = sData.substr(1,sData.length-2);
    var aEmpInfoField = sData.split(':');
    if ( aEmpInfoField.length === 2 ) {
      var sFieldName = aEmpInfoField[0].trim();
      var FieldData = aEmpInfoField[1].trim();
      if ( sFieldName.length > 1 )
        if ( (sFieldName[0] === '"') && (sFieldName[sFieldName.length-1] === '"') )
          sFieldName = sFieldName.substr(1,sFieldName.length-2);
      if ( FieldData.length > 1 )
        if ( (FieldData[0] === '"') && (FieldData[FieldData.length-1] === '"') )
          FieldData = FieldData.substr(1,FieldData.length-2);

      // employeeInfo:
      switch( iFieldIdx ) {
        case 0: // first_name
        case 1: // last_name
          aFieldData.push(FieldData);
          if ( bIsValidData )
            bIsValidData = ( FieldData.length > 0 );
          break;
        case 2: // title
        case 3: // manager
          aFieldData.push(FieldData);
          break;
        case 4: // role_id
        case 5: // department_id
          aFieldData.push(FieldData);
          if ( bIsValidData )
            bIsValidData = ( FieldData > 0 );
          break;
        case 6: // manager_id
          aFieldData.push(FieldData);
          if ( bIsValidData )
            bIsValidData = ( FieldData >= 0 );
          break;
      }
      
    }
  }

  return( aFieldData );
}

const addEmployeeRecord = ( empInfo ) => {
  var bIsValidData=true;

  if ( bDebugging ) {
    console.log( `====================================================================================` );
  }
  
  let aFieldData = [];
  let sDatarec = "";
  aFieldData = retrieveEmployeeInfo( empInfo );
  for( var iFieldIdx=0; iFieldIdx < aFieldData.length; iFieldIdx++ ) {
    var sFieldData = aFieldData[iFieldIdx];
    sDatarec += (sFieldData + ((iFieldIdx < aFieldData.length-1) ? "|" : "" ) );
    switch( iFieldIdx ) {
      case 0: // first_name
        if ( bIsValidData )
          bIsValidData = (sFieldData.trim().length > 0);
        break;
      case 1: // last_name
        if ( bIsValidData )
          bIsValidData = (sFieldData.trim().length > 0);
        break;
      case 2: // title
        break;
      case 3: // manager
        break;
      case 4: // role_id
        if ( bIsValidData )
          bIsValidData = ( sFieldData > 0 );
        break;
      case 5: // department_id
        if ( bIsValidData )
          bIsValidData = ( sFieldData > 0 );
        break;
      case 6: // manager_id
        if ( bIsValidData )
          bIsValidData = ( sFieldData >= 0 );
        break;
    }

  }
  // sDatarec += "]";
  if ( bDebugging )
  {
    console.log( `addEmployeeRecord: [${sDatarec}]` );
  }
  
  if ( bDebugging ) {
    console.log( `====================================================================================` );
  }

  if ( bIsValidData ) {
    // Insert new record:
    if ( !bEmployeeExists )
    {
      if ( bDebugging )
        console.log( "Adding new record..." );

      var aDataElements = sDatarec.split('|');
      
      let sQuery = `INSERT INTO employees `
                 + `(first_name,last_name,role_id,manager_id) `
                 + `VALUES `
                 + `("${aDataElements[0]}","${aDataElements[1]}",${aDataElements[4]},${aDataElements[6]});`;

      // console.log( `addEmployeeRecord(): [${sQuery}]` );
      connection.beginTransaction();
      connection.query( sQuery, (err) => {
        if (err) throw err;
        connection.commit();
        // console.log( `Executed: [${sQuery}]` );
      });
    }
  }
  
  return( bIsValidData );

};

let employeeInfo = [
  { first_name : "" },
  { last_name : "" },
  { title : "" },
  { manager : "" },
  { role_id: 0 },
  { department_id : 0 },
  { manager_id: 0 }
];

const updateEmployeeRole = () => {
  let sEmployeeName="";
  let sNewTitle="";

  // query the database for all employees:
  let sQuery  = `SELECT `
              +   `employees.id, `
              +   `employees.first_name, `
              +   `employees.last_name, `
              +   `employees.role_id, `
              +   `Roles.title AS role_title, `
              +   `Departments.name AS dept_name, `
              +   `MgrInfo.Manager `
              + `FROM MgrInfo `
              + `INNER JOIN ((employees `
              +   `INNER JOIN Roles ON employees.role_id = Roles.id) `
              +   `INNER JOIN Departments ON Roles.department_id = Departments.id) `
              + `ON MgrInfo.MgrID = employees.manager_id `
              + `ORDER BY employees.last_name, employees.first_name, employees.id;`;

  connection.query( sQuery, (err, results) => {
    if (err) throw err;

    // Once you have the list of employees, prompt the user to select one:
    
    let aEmployeeIDs = [];
    results.forEach( ({ id, first_name, last_name, role_id, role_title }) => {
      aEmployeeIDs.push( {id, first_name, last_name, role_id, role_title} );
    });
    
    inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ first_name, last_name, role_title }) => {
              var sName = `${last_name}, ${first_name} (${role_title})`;
              choiceArray.push( sName );
            });
            return choiceArray;
          },
          message: 'Select the employee to update:',
        },
      ])
      .then( (answer) => {
        sEmployeeName = answer.choice;
        var iEmployeeID=0;
        var iRoleID=0;
        var sCurrentRole="";
        var iStrIdx = sEmployeeName.indexOf(" (");
        // remove the role tite:
        if ( iStrIdx > 0 ) {
          var iLen = ( sEmployeeName.length - iStrIdx - 3 );
          if ( iLen > 0 )
            sCurrentRole = sEmployeeName.substr(iStrIdx+2,iLen);
          sEmployeeName = sEmployeeName.substr(0,iStrIdx);
        }
        
        var aEmployeeElements = sEmployeeName.split(',');
        if ( aEmployeeElements.length === 2 )
        {
          for( var i=0; i < aEmployeeIDs.length; i++ ) {
            if ( aEmployeeIDs[i].first_name === aEmployeeElements[1].trim()
                  && aEmployeeIDs[i].last_name === aEmployeeElements[0].trim() 
                  && aEmployeeIDs[i].role_title === sCurrentRole )
            {
              iEmployeeID = aEmployeeIDs[i].id;
              iRoleID = aEmployeeIDs[i].role_id;
            }
          }
          if ( iEmployeeID > 0 ) {
            
            if ( bDebugging)
              console.log( `updateEmployeeRole(): [${iEmployeeID}: ${aEmployeeElements[1].trim()} ${aEmployeeElements[0].trim()}] [${iRoleID}: ${sCurrentRole}]` );

            // Create a list of roles to pick from:
            sQuery = `select id, title from roles where id <> ${iRoleID} order by title`;
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
              
              let aRolesInfo = [];
              results.forEach( ({ id, title }) => {
                aRolesInfo.push( {id, title} );
              });

              inquirer
              .prompt([
                {
                  name: 'choice',
                  type: 'rawlist',
                  choices() {
                    const choiceArray = [];
                    results.forEach( ({ title }) => {
                      choiceArray.push( title );
                    });
                    return choiceArray;
                  },
                  message: 'Select the new role for the employee:',
                },
              ])
              .then( (answer) => {
                var sNewTitle = answer.choice;
                var iNewTitleID = 0;
                for( var i=0; (iNewTitleID <= 0) && (i < aRolesInfo.length); i++ ) {
                  if ( aRolesInfo[i].title === sNewTitle )
                  {
                    iNewTitleID = aRolesInfo[i].id;
                  }
                }
                if ( iNewTitleID > 0 )
                {
                  if ( bDebugging)
                    console.log( `updateEmployeeRole(): [${iNewTitleID}: [${sNewTitle}]` );

                  sQuery = `UPDATE employees SET employees.role_id = ${iNewTitleID} WHERE id = ${iEmployeeID};`;
                  connection.query( sQuery, (err, results) => {
                    if (err) throw err;
                    displayMainMenu();
                  });
      
                } // endIf( iNewTitleID > 0 )
                
              }); // endInquirerPrompt
              
            }); // endQuery( roles )
            
          } // endIf( iEmployeeID > 0 )
          
        } else {
          console.log( "PROBLEM with the employee selected: [" + sEmployeeName + "]" );
        }

      });

  });

  return;
}

const updateEmployeeManager = () => {
  let sEmployeeName="";
  let sNewManager="";

  // query the database for all employees:
  let sQuery = 
    `SELECT Employees.id, `
      + `Employees.first_name, `
      + `Employees.last_name, `
      + `Employees.manager_id, `
      + `Employees.role_id, `
      + `Roles.title AS roles_title `
      + `FROM (Employees `
        + `LEFT JOIN MgrInfo ON Employees.id = MgrInfo.mgrid) `
        + `INNER JOIN Roles ON Employees.role_id = Roles.id `
      + `WHERE ( ((MgrInfo.Manager) Is Null) ) `
      + `ORDER BY Employees.last_name, Employees.first_name;`;

    // console.log( sQuery );

    connection.query( sQuery, (err, results) => {
    if (err) throw err;

    // Once you have the list of managers, prompt the user to select one:
    
    let aEmployeeInfo = [];
    results.forEach( ({ id, first_name, last_name, role_id, roles_title }) => {
      aEmployeeInfo.push( {id, first_name, last_name, role_id, roles_title} );
    });
    
    inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ first_name, last_name, roles_title }) => {
              var sName = `${last_name}, ${first_name} (${roles_title})`;
              choiceArray.push( sName );
            });
            return choiceArray;
          },
          message: 'Select the employee to update:',
        },
      ])
      .then( (answer) => {
        sEmployeeName = answer.choice;
        var iEmployeeID=0;
        var iRoleID=0;
        var sCurrentRole="";
        var iStrIdx = sEmployeeName.indexOf(" (");
        // remove the role tite:
        if ( iStrIdx > 0 ) {
          var iLen = ( sEmployeeName.length - iStrIdx - 3 );
          if ( iLen > 0 )
            sCurrentRole = sEmployeeName.substr(iStrIdx+2,iLen);
          sEmployeeName = sEmployeeName.substr(0,iStrIdx);
        }
        
        var aEmployeeElements = sEmployeeName.split(',');
        if ( aEmployeeElements.length === 2 )
        {
          for( var i=0; i < aEmployeeInfo.length; i++ ) {
            if ( aEmployeeInfo[i].first_name === aEmployeeElements[1].trim()
                 && aEmployeeInfo[i].last_name === aEmployeeElements[0].trim()  )
            {
              iEmployeeID = aEmployeeInfo[i].id;
              iRoleID = aEmployeeInfo[i].role_id;
            }
          }
          if ( iEmployeeID > 0 ) {
            
            if ( bDebugging)
              console.log( `updateEmployeeManager(): [${iEmployeeID}: ${aEmployeeElements[1].trim()} ${aEmployeeElements[0].trim()}] [${iRoleID}: ${sCurrentRole}]` );

            // Create a list of managers to pick from:
            sQuery  = `SELECT mgrid,Manager,MgrTitle FROM MgrInfo WHERE mgrid > 0 ORDER BY Manager;`;
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
              
              let aManagerInfo = [];
              results.forEach( ({ mgrid, Manager, MgrTitle }) => {
                aManagerInfo.push( {mgrid,Manager,MgrTitle} );
              });

              inquirer
              .prompt([
                {
                  name: 'choice',
                  type: 'rawlist',
                  choices() {
                    const choiceArray = [];
                    results.forEach( ({ Manager, MgrTitle }) => {
                      var sName = `${Manager} (${MgrTitle})`;
                      choiceArray.push( sName );
                    });
                    choiceArray.push( " (none)" );
                    return choiceArray;
                  },
                  message: 'Select the new manager for the employee:',
                },
              ])
              .then( (answer) => {
                var sNewManager = answer.choice;
                var iNewMgrID = -1;
                
                var iStrIdx = sNewManager.indexOf(" (");
                // remove the role tite:
                if ( iStrIdx > 0 ) {
                  var iLen = ( sNewManager.length - iStrIdx - 3 );
                  if ( iLen > 0 )
                    sCurrentRole = sNewManager.substr(iStrIdx+2,iLen);
                    sNewManager = sNewManager.substr(0,iStrIdx);
                } else {
                  sNewManager = "";
                }
                
                // Allow the user to un-assign the associated manager:
                if ( sNewManager.length === 0 )
                  iNewMgrID = 0;
                for( var i=0; (iNewMgrID < 0) && (i < aManagerInfo.length); i++ ) {
                  if ( aManagerInfo[i].Manager === sNewManager )
                  {
                    iNewMgrID = aManagerInfo[i].mgrid;
                  }
                }
                if ( iNewMgrID >= 0 )
                {
                  if ( bDebugging)
                    console.log( `updateEmployeeManager(): [${iNewMgrID}: [${sNewManager}]` );

                  sQuery = `UPDATE employees SET employees.manager_id = ${iNewMgrID} WHERE id = ${iEmployeeID};`;
                  connection.query( sQuery, (err, results) => {
                    if (err) throw err;
                    displayMainMenu();
                  });
      
                } // endIf( iNewTitleID > 0 )
                
              }); // endInquirerPrompt
              
            }); // endQuery( roles )
            
          } // endIf( iEmployeeID > 0 )
          
        } else {
          console.log( "PROBLEM with employee selected: [" + sEmployeeName + "]" );
        }

      });

  });
  
  return;
}

const removeEmployee = () => {
  let sEmployeeName="";
  
  // query the database for all employees:
  let sQuery  = `SELECT `;
      sQuery += `employees.id, `;
      sQuery += `employees.first_name, `;
      sQuery += `employees.last_name, `;
      sQuery += `Roles.title AS role_title, `;
      sQuery += `Departments.name AS dept_name, `;
      sQuery += `MgrInfo.Manager `;
      sQuery += `FROM MgrInfo `;
      sQuery += `INNER JOIN ((employees `;
      sQuery += `INNER JOIN Roles ON employees.role_id = Roles.id) `;
      sQuery += `INNER JOIN Departments ON Roles.department_id = Departments.id) `;
      sQuery += `ON MgrInfo.MgrID = employees.manager_id `;
      sQuery += `ORDER BY employees.last_name, employees.first_name, employees.id;`;

  connection.query( sQuery, (err, results) => {
    if (err) throw err;

    // Once you have the list of employees, prompt the user to select one:
    
    let aEmployeeIDs = [];
    results.forEach( ({ id, first_name, last_name, dept_name }) => {
      aEmployeeIDs.push( {id, first_name, last_name, dept_name} );
    });
    
    inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ first_name, last_name, dept_name }) => {
              var sName = `${last_name}, ${first_name} (${dept_name})`;
              choiceArray.push( sName );
            });
            return choiceArray;
          },
          message: 'Select the employee to remove:',
        },
      ])
      .then( (answer) => {
        sEmployeeName = answer.choice;
        var iEmployeeID=0;
        var sDeptName="";
        var iStrIdx = sEmployeeName.indexOf(" (");
        // remove the department name:
        if ( iStrIdx > 0 ) {
          var iDeptLen = ( sEmployeeName.length - iStrIdx - 3 );
          if ( iDeptLen > 0 )
            sDeptName = sEmployeeName.substr(iStrIdx+2,iDeptLen);
          sEmployeeName = sEmployeeName.substr(0,iStrIdx);
        }
    
        var aEmployeeElements = sEmployeeName.split(',');
        if ( aEmployeeElements.length === 2 )
        {
          for( var i=0; i < aEmployeeIDs.length; i++ ) {
            if ( aEmployeeIDs[i].first_name === aEmployeeElements[1].trim()
                  && aEmployeeIDs[i].last_name === aEmployeeElements[0].trim() 
                  && aEmployeeIDs[i].dept_name === sDeptName )
            {
              iEmployeeID = aEmployeeIDs[i].id;
            }
          }
          if ( iEmployeeID > 0 ) {
            if ( bDebugging )
              console.log( `Employee: [${iEmployeeID}: ${aEmployeeElements[1].trim()} ${aEmployeeElements[0].trim()} in ${sDeptName}]` );
            sQuery = `DELETE FROM employees WHERE id = ${iEmployeeID}`;
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
            });
          }
          
        } else {
          console.log( "Unable to DELETE Employee selected: [" + sEmployeeName + "]" );
        }

        displayMainMenu();
      });

  });

  return;
}

const addNewEmployee = () => {
  let sRole="";
  let sMgrName="";
  
  // bEmployeeExists = false;

  inquirer
  .prompt({
    name: 'firstName',
    type: 'input',
    message: 'What is the employees first name:',
  })
  .then( (answer) => {
  employeeInfo[0].first_name = answer.firstName.trim();
  
  inquirer
  .prompt({
    name: 'lastName',
    type: 'input',
    message: 'What is the employees last:',
  })
  .then( (answer) => {

    employeeInfo[1].last_name = answer.lastName.trim();

  // query the database for all roles:
  connection.query( 'SELECT * FROM roles ORDER BY title', (err, results) => {
    if (err) throw err;
    // Once you have the list of current/valid titles, prompt the user to select one:
    inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ title }) => {
              choiceArray.push( title );
            });
            return choiceArray;
          },
          message: 'Select the employee Title:',
        },
      ])
      .then( (answer) => {
        sRole = answer.choice;
        // console.log( "Selected Role: [" + sRole + "]" );
        employeeInfo[2].title = sRole;
        // console.log( employeeInfo );

        // query the database for all managers:
        connection.query( 'SELECT manager, mgrdeptname FROM mgrinfo WHERE mgrid > 0 ORDER BY manager', (err, results) => {
          if (err) throw err;
          // Once you have the list of current/valid managers, prompt the user to select a manager:
          inquirer
            .prompt([
              {
                name: 'choice',
                type: 'rawlist',
                choices() {
                  const choiceArray = [];
                  results.forEach( ({ manager, mgrdeptname }) => {
                    var sMgrInfo = `${manager} (${mgrdeptname})`;
                    // console.log( sMgrInfo );
                    choiceArray.push( sMgrInfo );
                  });
                  choiceArray.push( "(none)" );
                  return choiceArray;
                },
                message: 'Select a Manager:',
              },
            ])
            .then( (answer) => {
              sMgrName = answer.choice;
              // Remove the department name from the choice:
              var iIdx = sMgrName.indexOf( " (");
              if ( iIdx >= 0 ) {
                sMgrName = sMgrName.substr(0,iIdx);
              }
              employeeInfo[3].manager = sMgrName;
              
              // var sEmployeeInfo = JSON.stringify( employeeInfo );
              // console.log( sEmployeeInfo );
              // var employeeInfo2 = JSON.parse( sEmployeeInfo );
              // console.log( employeeInfo2 );
              
              // sQuery = `SELECT roles.id AS roles_id, department_id FROM roles WHERE title = "${employeeInfo[2].title}"`;
              // console.log( sQuery );
              
              connection.query( 
                'SELECT roles.id AS roles_id, department_id FROM roles WHERE ?',
                { title: employeeInfo[2].title }
                , (err, results) => {
                  if (err) throw err;
                  // for( var i=0; i < results.length; i++ ) {
                  //   console.log( JSON.stringify( results[i] ) );
                  // }
                  results.forEach( ({ roles_id, department_id }) => {
                    // console.log( `Role: [${roles_id}], Department: [${department_id}]` );
                    employeeInfo[4].role_id = roles_id;
                    employeeInfo[5].department_id = department_id;
                  });
                }
              );
              connection.query( 
                'SELECT mgrid FROM mgrinfo WHERE ?',
                { Manager: employeeInfo[3].manager }
                , (err, results) => {
                  if (err) throw err;
                  results.forEach( ({ mgrid }) => {
                    // console.log( `Manager: [${mgrid}]` );
                    employeeInfo[6].manager_id = mgrid;
                  });
                }
              );
              
              // reConnectDB();
              
              let aFieldData = [];
              let sDatarec = "addNewEmployee(): [";
              aFieldData = retrieveEmployeeInfo( employeeInfo );
              if ( aFieldData.length === 7 ) {
                for( var i=0; i < aFieldData.length; i++ ) {
                  var sFieldData = aFieldData[i];
                  sDatarec += (sFieldData + ((i < aFieldData.length-1) ? "," : "" ) );
                }
                sDatarec += "]";
                if ( bDebugging )
                  console.log( sDatarec );
                
                // if ( verifyEmployeeADD(aFieldData[0],aFieldData[1]) )
                // {
                //   bAddRecord = true;

                //   // bAdded = addEmployeeRecord( employeeInfo );

                //   // if ( bDebugging )
                //   //   if ( bAdded ) {
                //   //     console.log( "Employee was added!" );
                //   //   } else {
                //   //     console.log( "The employee could not be added!  Try again..." );
                //   //   }
                //   //   displayMainMenu();
                // }
                // else {
                //   displayMainMenu();
                // }

                // bAdded = addEmployeeRecord( employeeInfo );
                // if ( bAdded ) {
                //   console.log( "Employee was added!" );
                // } else {
                //   console.log( "The employee could not be added!  Try again..." );
                // }
                // displayMainMenu();
              }
            
              inquirer
              .prompt({
                name: 'action',
                type: 'list',
                message: 'Are you sure you wish to ADD this employeee?',
                choices: [
                  'Yes',
                  'No'
                ],
                })
              .then( (answer) => {
                if ( bEmployeeExists ) {
                  console.log( `Employee already exists!  Verify your information and try again...` );
                } else {
                  if ( answer.action === 'Yes' ) {
                    if ( addEmployeeRecord( employeeInfo ) ) {
                      if ( bDebugging )
                        console.log( "Employee was added!" );
                    } else {
                      console.log( "The employee could not be added!  Try again..." );
                    }
                  }
                }
                displayMainMenu();
              });
              
            }); // endThen( Manager )
        }); // endConnection.query( Manager )

      }); // endThen( Roles )
  }); // endConnection.query( Roles )

  }); // endThen( lastName )
  }); // endThen( firstName )

  return;
};

const displayMainMenu = () =>
{
  if ( bEmployeeExists ) {
    if ( bDebugging )
      console.log( `bEmployeeExists: [${bEmployeeExists}]` );
    bEmployeeExists = false;
  }
  
  createMgrInfo();
  
  inquirer
    .prompt({
      name: 'action',
      type: 'rawlist',
      message: 'What would you like to do?',
      choices: [
        'View all employees',
        'View all employees by Department',
        'View all employees by Role',
        'View all employees by Manager',
        // new inquirer.Separator(),
        'Add Employee',
        'Remove Employee',
        // new inquirer.Separator(),
        'Update employee Role',
        'Update employee Manager',
        // new inquirer.Separator(),
        'Exit'
      ],
    })
    .then( (answer) =>
    {
      switch( answer.action )
      {
        case 'View all employees':
          // First and foremost, create a mgrList:
          // createMgrInfo();
          displayAllEmployees();
          break;
        case 'View all employees by Department':
          displayAllEmployees('Department');
          break;
        case 'View all employees by Role':
          displayAllEmployees('Title');
          break;
        case 'View all employees by Manager':
          displayAllEmployees('Manager');
          // managerSearch();
          break;
        
        case 'Add Employee':
          addNewEmployee();
          break;
        case 'Remove Employee':
          removeEmployee();
          break;
        
        case 'Update employee Role':
          updateEmployeeRole();
          break;
        case 'Update employee Manager':
          updateEmployeeManager();
          // console.log( `Selected Manager: ${sMgrSelected}` );
          break;
        
        case 'Exit':
          connection.end();
          return;
          // break;

        default:
          console.log( `Invalid action: ${answer.action}` );
          break;
      }
    });
};
