import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#002e4f', // Ocean Blue
          contrastText: '#ffffff',
        },
        secondary: {
          // main: '#bfe1e9', // Blue light theme
          main: '#5cbd7d', // Green light theme
          // main: '#fcb073', // Orange light theme
        },
        error: {
          main: '#f74646',
        },
        background: {
          default: '#faf2e3',
        },
        text: {
          primary: '#002e4f',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#ffffff',
          contrastText: '#002e4f',
        },
        secondary: {
          main: '#002e4f' // Ocean blue
        },
        error: {
          main: '#f74646',
        },
        background: {
          default: '#000000',
        }
      }
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: 'primary.main',
          padding: 0,
          paddingLeft: 4,
          paddingRight: 4,
          variants: [
            {
              props: {
                variant: 'head',
              },
              style: {
                fontWeight: 'bold',
              },
            },
          ],
        },
      }
    },
    MuiAccordion: {
      styleOverrides: {
        root: { 
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 5,
          backgroundColor: 'background.container'
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          margin: 0,
          // color: 'red'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#bfe1e9',
          }
        }
      }
    }
  },
  typography: {
    fontFamily: 'Arial',
    h1: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  // components: {
  //   MuiButton: {
  //     styleOverrides: {
  //       root: {
  //         textTransform: 'none',
  //         fontWeight: 600,
  //       },
  //     },
  //   },
  //   MuiTextField: {
  //     defaultProps: {
  //       variant: 'outlined',
  //       fullWidth: true,
  //     },
  //   },
  //   MuiPaper: {
  //     styleOverrides: {
  //       root: {
  //         backgroundImage: 'none',
  //       },
  //     },
  //   },
  // },
});
