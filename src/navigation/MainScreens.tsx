import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";

// Screens
import DashboardScreen from "@/screens/main/DashboardScreen";
import TimeTrackingScreen from "@/screens/main/TimeTrackingScreen";
import MyHoursScreen from "@/screens/main/MyHoursScreen";
import DailyLogsScreen from "@/screens/main/DailyLogsScreen";
import FieldMediaScreen from "@/screens/main/FieldMediaScreen";
import ActiveWorkersScreen from "@/screens/main/ActiveWorkersScreen";
import ProjectsScreen from "@/screens/main/ProjectsScreen";
import LiveMapScreen from "@/screens/main/LiveMapScreen";
import ContractorsScreen from "@/screens/main/ContractorsScreen";
import EmployeesScreen from "@/screens/main/EmployeesScreen";
import PayrollScreen from "@/screens/main/PayrollScreen";
import ProductionPayScreen from "@/screens/main/ProductionPayScreen";
import EstimatesScreen from "@/screens/main/EstimatesScreen";
import ReceivablesScreen from "@/screens/main/ReceivablesScreen";
import ExpensesScreen from "@/screens/main/ExpensesScreen";
import JobCostScreen from "@/screens/main/JobCostScreen";
import VehiclesScreen from "@/screens/main/VehiclesScreen";
import DispatchScreen from "@/screens/main/DispatchScreen";
import TripLogScreen from "@/screens/main/TripLogScreen";
import MileageLogScreen from "@/screens/main/MileageLogScreen";
import FleetCostReportScreen from "@/screens/main/FleetCostReportScreen";
import MaterialCatalogScreen from "@/screens/main/MaterialCatalogScreen";
import InventoryItemsScreen from "@/screens/main/InventoryItemsScreen";
import WarehousesScreen from "@/screens/main/WarehousesScreen";
import VendorsScreen from "@/screens/main/VendorsScreen";
import PurchaseOrdersScreen from "@/screens/main/PurchaseOrdersScreen";
import VendorInvoicesScreen from "@/screens/main/VendorInvoicesScreen";
import SDSLibraryScreen from "@/screens/main/SDSLibraryScreen";
import JobScheduleScreen from "@/screens/main/JobScheduleScreen";
import ReportsScreen from "@/screens/main/ReportsScreen";
import LocationReportScreen from "@/screens/main/LocationReportScreen";
import ReferralsScreen from "@/screens/main/ReferralsScreen";
import DepartmentsScreen from "@/screens/main/DepartmentsScreen";
import WorkTypesScreen from "@/screens/main/WorkTypesScreen";
import ClassificationsScreen from "@/screens/main/ClassificationsScreen";
import JobRolesScreen from "@/screens/main/JobRolesScreen";
import CompanyProfileScreen from "@/screens/main/CompanyProfileScreen";
import BillingScreen from "@/screens/main/BillingScreen";
import AccessRolesScreen from "@/screens/main/AccessRolesScreen";
import AdminPanelScreen from "@/screens/main/AdminPanelScreen";
import ProfileScreen from "@/screens/main/ProfileScreen";

const Stack = createNativeStackNavigator();

function DrawerToggle() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        marginLeft: 16,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
      }}
      activeOpacity={0.6}
    >
      <Ionicons name="menu" size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const screenOptions = {
  headerStyle: { backgroundColor: "#0F1D32" },
  headerTintColor: "#FFFFFF",
  headerTitleStyle: { fontWeight: "600" as const, fontSize: 17 },
  headerLeft: () => <DrawerToggle />,
};

export default function MainScreens() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Dashboard */}
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />

      {/* Operations */}
      <Stack.Screen name="TimeTracking" component={TimeTrackingScreen} options={{ title: "Time Tracking" }} />
      <Stack.Screen name="MyHours" component={MyHoursScreen} options={{ title: "My Hours" }} />
      <Stack.Screen name="DailyLogs" component={DailyLogsScreen} options={{ title: "Daily Logs" }} />
      <Stack.Screen name="FieldMedia" component={FieldMediaScreen} options={{ title: "Field Media" }} />
      <Stack.Screen name="ActiveWorkers" component={ActiveWorkersScreen} options={{ title: "Active Workers" }} />
      <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: "Projects" }} />
      <Stack.Screen name="LiveMap" component={LiveMapScreen} options={{ title: "Live Map" }} />
      <Stack.Screen name="JobSchedule" component={JobScheduleScreen} options={{ title: "Job Schedule" }} />
      <Stack.Screen name="Contractors" component={ContractorsScreen} options={{ title: "Contractors Hub" }} />

      {/* Team & Payroll */}
      <Stack.Screen name="Employees" component={EmployeesScreen} options={{ title: "Employees" }} />
      <Stack.Screen name="Payroll" component={PayrollScreen} options={{ title: "Payroll" }} />
      <Stack.Screen name="ProductionPay" component={ProductionPayScreen} options={{ title: "Production Pay" }} />

      {/* Job Costing */}
      <Stack.Screen name="Estimates" component={EstimatesScreen} options={{ title: "Estimates" }} />
      <Stack.Screen name="Receivables" component={ReceivablesScreen} options={{ title: "Receivables" }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: "Expenses" }} />
      <Stack.Screen name="JobCost" component={JobCostScreen} options={{ title: "Job Cost" }} />

      {/* Fleet */}
      <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: "Vehicles" }} />
      <Stack.Screen name="Dispatch" component={DispatchScreen} options={{ title: "Dispatch Board" }} />
      <Stack.Screen name="TripLog" component={TripLogScreen} options={{ title: "Trip Log" }} />
      <Stack.Screen name="MileageLog" component={MileageLogScreen} options={{ title: "Mileage Log" }} />
      <Stack.Screen name="FleetCostReport" component={FleetCostReportScreen} options={{ title: "Fleet Cost Report" }} />

      {/* Inventory */}
      <Stack.Screen name="MaterialCatalog" component={MaterialCatalogScreen} options={{ title: "Material Catalog" }} />
      <Stack.Screen name="InventoryItems" component={InventoryItemsScreen} options={{ title: "Inventory Items" }} />
      <Stack.Screen name="Warehouses" component={WarehousesScreen} options={{ title: "Warehouses" }} />
      <Stack.Screen name="Vendors" component={VendorsScreen} options={{ title: "Vendors" }} />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ title: "Purchase Orders" }} />
      <Stack.Screen name="VendorInvoices" component={VendorInvoicesScreen} options={{ title: "Vendor Invoices" }} />

      {/* Tools */}
      <Stack.Screen name="SDSLibrary" component={SDSLibraryScreen} options={{ title: "SDS Library" }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
      <Stack.Screen name="LocationReport" component={LocationReportScreen} options={{ title: "Location Report" }} />

      {/* Referral */}
      <Stack.Screen name="Referrals" component={ReferralsScreen} options={{ title: "Referral Program" }} />

      {/* Settings */}
      <Stack.Screen name="Departments" component={DepartmentsScreen} options={{ title: "Departments" }} />
      <Stack.Screen name="WorkTypes" component={WorkTypesScreen} options={{ title: "Work Types" }} />
      <Stack.Screen name="Classifications" component={ClassificationsScreen} options={{ title: "Classifications" }} />
      <Stack.Screen name="JobRoles" component={JobRolesScreen} options={{ title: "Job Roles" }} />
      <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} options={{ title: "Company Profile" }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: "Billing & Subscription" }} />
      <Stack.Screen name="AccessRoles" component={AccessRolesScreen} options={{ title: "Access Roles" }} />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: "Admin Panel" }} />

      {/* Profile */}
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Stack.Navigator>
  );
}
